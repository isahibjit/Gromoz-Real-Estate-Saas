import { Test } from '@nestjs/testing';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { NotFoundException, type INestApplication } from '@nestjs/common';
import request from 'supertest';
import { TasksController } from './crm.controllers';
import { CrmService } from './crm.service';
import { LeadVisibilityService } from './lead-visibility.service';
import { PrismaService } from '../persistence/prisma/prisma.service';
import { RealtimeService } from '../realtime/realtime.service';
import { AccessService } from '../access/access.service';
import { RedisService } from '../redis/redis.service';

describe('Employee task HTTP authorization', () => {
  let app: INestApplication;
  let jwt: JwtService;
  let crm: CrmService;
  const existing = {
    id: 'task-1',
    title: 'Prepare documents',
    assignedToId: 'employee',
    createdById: 'admin',
    leadId: null,
    status: 'Pending',
    priority: 'Medium',
  };
  const access = { hasPermission: jest.fn() };
  const visibility = {
    resolveAssignmentScopeUserIds: jest.fn(),
    assignmentScope: jest.fn((ids: string[]) => ({ ownerId: { in: ids } })),
  };
  const db = {
    task: {
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    user: { findUnique: jest.fn(), findMany: jest.fn() },
    auditLog: { create: jest.fn() },
  };
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [JwtModule.register({ secret: 'task-authorization-test-only' })],
      controllers: [TasksController],
      providers: [
        CrmService,
        { provide: AccessService, useValue: access },
        { provide: LeadVisibilityService, useValue: visibility },
        { provide: PrismaService, useValue: db },
        { provide: RealtimeService, useValue: {} },
        {
          provide: RedisService,
          useValue: { get: jest.fn().mockResolvedValue(null) },
        },
      ],
    }).compile();
    jwt = module.get(JwtService);
    crm = module.get(CrmService);
    app = module.createNestApplication();
    await app.init();
  });
  beforeEach(() => {
    jest.clearAllMocks();
    access.hasPermission.mockResolvedValue(true);
    visibility.assignmentScope.mockImplementation((ids: string[]) => ({
      ownerId: { in: ids },
    }));
    visibility.resolveAssignmentScopeUserIds.mockImplementation(
      async (actor: { sub: string; role: string }) =>
        actor.role === 'ADMIN'
          ? null
          : [
              actor.sub,
              ...(actor.role === 'MANAGER' || actor.role === 'TEAM_LEADER'
                ? ['permitted']
                : []),
            ],
    );
    db.task.findFirst.mockResolvedValue(existing);
    db.task.findMany.mockResolvedValue([existing]);
    db.task.count.mockResolvedValue(1);
    db.task.create.mockImplementation(
      async ({ data }: { data: Record<string, unknown> }) => ({
        ...existing,
        ...data,
      }),
    );
    db.task.update.mockImplementation(
      async ({ data }: { data: Record<string, unknown> }) => ({
        ...existing,
        ...data,
      }),
    );
    db.user.findUnique.mockResolvedValue({
      id: 'employee',
      fullName: 'Employee',
      isActive: true,
    });
    db.user.findMany.mockResolvedValue([
      { id: 'employee', fullName: 'Employee' },
    ]);
    db.auditLog.create.mockResolvedValue({});
  });
  afterEach(() => jest.restoreAllMocks());
  afterAll(async () => app.close());
  const token = (role = 'HR') => jwt.sign({ sub: 'viewer', role });

  it('allows HR to create an ordinary task for another employee with create permission', async () => {
    const result = await request(app.getHttpServer())
      .post('/tasks')
      .set('Authorization', `Bearer ${token()}`)
      .send({ title: 'Prepare documents', assignedToId: 'employee' })
      .expect(201);
    expect(result.body.assignedToId).toBe('employee');
    expect(access.hasPermission).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'HR' }),
      'tasks',
      'create',
    );
    expect(db.task.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        assignedToId: 'employee',
        createdById: 'viewer',
      }),
    });
    expect(db.auditLog.create).toHaveBeenCalled();
  });
  it('allows HR to edit another employee task with update permission', async () => {
    await request(app.getHttpServer())
      .patch('/tasks/task-1')
      .set('Authorization', `Bearer ${token()}`)
      .send({ title: 'Updated task' })
      .expect(200);
    expect(db.task.update).toHaveBeenCalledWith({
      where: { id: 'task-1' },
      data: expect.objectContaining({
        title: 'Updated task',
        assignedToId: 'employee',
      }),
    });
  });
  it('lists employee tasks for HR without broadening lead visibility', async () => {
    await request(app.getHttpServer())
      .get('/tasks')
      .set('Authorization', `Bearer ${token()}`)
      .expect(200);
    const where = db.task.findMany.mock.calls[0][0].where;
    expect(where.assignedToId).toBeUndefined();
    expect(JSON.stringify(where.AND)).toContain('viewer');
  });
  it.each(['create', 'update', 'delete'] as const)(
    'denies HR %s when that action is disabled, despite role',
    async (action) => {
      access.hasPermission.mockImplementation(
        async (_actor: unknown, _module: string, requested: string) =>
          requested !== action,
      );
      const agent = request(app.getHttpServer());
      const req =
        action === 'create'
          ? agent.post('/tasks')
          : action === 'update'
          ? agent.patch('/tasks/task-1')
          : agent.delete('/tasks/task-1');
      await req
        .set('Authorization', `Bearer ${token()}`)
        .send({ title: 'Changed', assignedToId: 'employee' })
        .expect(403);
      expect(access.hasPermission).toHaveBeenCalledWith(
        expect.anything(),
        'tasks',
        action,
      );
      expect(db.task.create).not.toHaveBeenCalled();
      expect(db.task.update).not.toHaveBeenCalled();
      expect(db.task.delete).not.toHaveBeenCalled();
    },
  );
  it.each(['MANAGER', 'TEAM_LEADER'])(
    'does not let %s take over an outside task by changing its assignee',
    async (role) => {
      await request(app.getHttpServer())
        .patch('/tasks/task-1')
        .set('Authorization', `Bearer ${token(role)}`)
        .send({ assignedToId: 'permitted' })
        .expect(403);
      expect(db.task.update).not.toHaveBeenCalled();
    },
  );
  it.each(['MANAGER', 'TEAM_LEADER'])(
    'does not let %s delete an outside task',
    async (role) => {
      await request(app.getHttpServer())
        .delete('/tasks/task-1')
        .set('Authorization', `Bearer ${token(role)}`)
        .expect(403);
      expect(db.task.delete).not.toHaveBeenCalled();
    },
  );
  it('still blocks assigning a task outside a Manager employee scope', async () => {
    await request(app.getHttpServer())
      .post('/tasks')
      .set('Authorization', `Bearer ${token('MANAGER')}`)
      .send({ title: 'Outside', assignedToId: 'employee' })
      .expect(403);
    expect(db.task.create).not.toHaveBeenCalled();
  });
  it('requires lead visibility for HR to edit a lead-linked task', async () => {
    db.task.findFirst.mockResolvedValue({ ...existing, leadId: 'hidden-lead' });
    jest
      .spyOn(crm, 'getLead')
      .mockRejectedValue(new NotFoundException('Lead not found'));
    await request(app.getHttpServer())
      .patch('/tasks/task-1')
      .set('Authorization', `Bearer ${token()}`)
      .send({ title: 'Changed' })
      .expect(404);
    expect(db.task.update).not.toHaveBeenCalled();
  });
  it('does not expose task endpoints without authentication', async () => {
    await request(app.getHttpServer())
      .post('/tasks')
      .send({ title: 'Changed', assignedToId: 'employee' })
      .expect(401);
    expect(db.task.create).not.toHaveBeenCalled();
  });

  it.each(['MANAGER', 'TEAM_LEADER'])(
    'still lets %s manage tasks inside their employee scope',
    async (role) => {
      db.task.findFirst.mockResolvedValue({
        ...existing,
        assignedToId: 'permitted',
      });
      await request(app.getHttpServer())
        .patch('/tasks/task-1')
        .set('Authorization', `Bearer ${token(role)}`)
        .send({ title: 'Updated' })
        .expect(200);
      await request(app.getHttpServer())
        .delete('/tasks/task-1')
        .set('Authorization', `Bearer ${token(role)}`)
        .expect(200);
    },
  );
  it('rejects inactive employees before HR task creation writes', async () => {
    db.user.findUnique.mockResolvedValue({ id: 'employee', isActive: false });
    await request(app.getHttpServer())
      .post('/tasks')
      .set('Authorization', `Bearer ${token()}`)
      .send({ title: 'Task', assignedToId: 'employee' })
      .expect(400);
    expect(db.task.create).not.toHaveBeenCalled();
  });
  it('rejects reassignment to a missing employee', async () => {
    db.user.findUnique.mockResolvedValue(null);
    await request(app.getHttpServer())
      .patch('/tasks/task-1')
      .set('Authorization', `Bearer ${token()}`)
      .send({ assignedToId: 'missing' })
      .expect(400);
    expect(db.task.update).not.toHaveBeenCalled();
  });
  it('does not give HR access to hidden lead context during task creation', async () => {
    jest
      .spyOn(crm, 'getLead')
      .mockRejectedValue(new NotFoundException('Lead not found'));
    await request(app.getHttpServer())
      .post('/tasks')
      .set('Authorization', `Bearer ${token()}`)
      .send({ title: 'Task', assignedToId: 'employee', leadId: 'hidden' })
      .expect(404);
    expect(db.task.create).not.toHaveBeenCalled();
  });
  it('honors configured task access for a Marketing employee without giving access to other employees', async () => {
    await request(app.getHttpServer())
      .get('/tasks')
      .set('Authorization', `Bearer ${token('MARKETING')}`)
      .expect(200);
    expect(db.task.findMany.mock.calls[0][0].where.assignedToId).toEqual({
      in: ['viewer'],
    });
  });
});
