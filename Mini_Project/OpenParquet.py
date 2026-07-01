import pandas as pd

file_path = r"D:\Mini_Project\results\Benign-Monday-WorkingHours.pcap_ISCX.parquet"

df = pd.read_parquet(file_path)

print(df.head())
print(df.shape)
print(df.columns)
