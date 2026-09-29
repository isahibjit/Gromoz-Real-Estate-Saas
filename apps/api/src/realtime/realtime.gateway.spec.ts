import { RealtimeGateway } from './realtime.gateway';

describe('RealtimeGateway - emitUserSessionExpired', () => {
  let gateway: RealtimeGateway;
  let mockServer: any;

  beforeEach(() => {
    gateway = new RealtimeGateway(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );

    mockServer = {
      to: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      emit: jest.fn(),
      disconnectSockets: jest.fn(),
    };

    (gateway as any).server = mockServer;
  });

  it('emits logout and session_expired events to the user room and disconnects sockets', () => {
    const userId = 'emp-456';
    const reason = 'Your account has been deactivated. Please contact an administrator.';

    gateway.emitUserSessionExpired(userId, reason);

    expect(mockServer.to).toHaveBeenCalledWith(`user:${userId}`);
    expect(mockServer.emit).toHaveBeenCalledWith(
      'auth:logout',
      expect.objectContaining({ reason }),
    );
    expect(mockServer.emit).toHaveBeenCalledWith(
      'session_expired',
      expect.objectContaining({ reason }),
    );
    expect(mockServer.in).toHaveBeenCalledWith(`user:${userId}`);
    expect(mockServer.disconnectSockets).toHaveBeenCalledWith(true);
  });
});
