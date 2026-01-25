import duckdb 
db_conn = duckdb.connect('./data/rates.duckdb')
df = db_conn.execute("""SELECT * FROM rates""").df()
print(df)
