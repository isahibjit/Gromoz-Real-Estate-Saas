import psycopg2

conn = psycopg2.connect("postgresql://trurootrealty:IAMPOSSIBLE1A!@127.0.0.1:5440/trurootrealty")
cur = conn.cursor()

cur.execute('SELECT count(*) FROM "Lead"')
print("Current DB Leads count:", cur.fetchone()[0])

cur.execute('SELECT count(*) FROM "Project"')
print("Current DB Projects count:", cur.fetchone()[0])

cur.execute('SELECT "sourceId", count(*) FROM "Lead" GROUP BY "sourceId"')
print("Current DB Leads by sourceId:", cur.fetchall())

cur.execute('SELECT id, name, category, key FROM "LeadMaster" WHERE category IN (\'source\', \'lead_source\')')
print("LeadMaster sources:", cur.fetchall())

cur.execute('SELECT id, name, code FROM "LeadMasterValue" WHERE "categoryId" IN (SELECT id FROM "LeadMasterCategory" WHERE code IN (\'source\', \'lead_source\'))')
print("LeadMasterValue sources:", cur.fetchall())

# Now let's analyze pre_wipe_backup_.sql
print("\n--- Analyzing pre_wipe_backup_.sql ---")
try:
    with open('/home/ubuntu/pre_wipe_backup_.sql', 'r', encoding='utf-8', errors='ignore') as f:
        in_lead = False
        lead_rows = []
        lead_cols = []
        for line in f:
            if line.startswith('COPY public."Lead" '):
                in_lead = True
                cols_part = line[line.index('(')+1 : line.index(')')]
                lead_cols = [c.strip().strip('"') for c in cols_part.split(',')]
                continue
            if in_lead:
                if line.strip() == r'\.':
                    in_lead = False
                    continue
                lead_rows.append(line.rstrip('\n').split('\t'))
                
        print(f"Total leads in backup: {len(lead_rows)}")
        if 'sourceId' in lead_cols:
            s_idx = lead_cols.index('sourceId')
            sources = {}
            for r in lead_rows:
                if len(r) > s_idx:
                    s = r[s_idx]
                    sources[s] = sources.get(s, 0) + 1
            print("Backup Leads by sourceId:", sources)
            
        if 'statusId' in lead_cols:
            st_idx = lead_cols.index('statusId')
            statuses = {}
            for r in lead_rows:
                if len(r) > st_idx:
                    st = r[st_idx]
                    statuses[st] = statuses.get(st, 0) + 1
            print("Backup Leads by statusId:", statuses)
except Exception as e:
    print("Error analyzing backup:", e)
