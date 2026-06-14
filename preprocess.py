import pandas as pd
import json
import os
import unicodedata
import math

workspace_dir = r"c:\Users\josed\Desktop\DashBoard"
output_dir = os.path.join(workspace_dir, "src", "data")
os.makedirs(output_dir, exist_ok=True)

def clean_column_name(col_name):
    if not isinstance(col_name, str):
        return col_name
    # Normalize to decompose characters (e.g. Ó becomes O + accent)
    nfkd_form = unicodedata.normalize('NFKD', col_name)
    cleaned = "".join([c for c in nfkd_form if not unicodedata.combining(c)])
    # Remove typical replacement characters or bad encodings
    cleaned = cleaned.replace('', '')
    
    # Fix Spanish typos/bad naming
    if 'gner' in cleaned.lower() or 'gener' in cleaned.lower():
        return 'Genero'
    
    # Remove special symbols like $, /, %, etc.
    for sym in ['$', '/', '%', '(', ')', '-', '_', '#']:
        cleaned = cleaned.replace(sym, '')
        
    # Remove spaces
    cleaned = cleaned.replace(' ', '')
    return cleaned.strip()

def clean_value(val):
    if isinstance(val, dict):
        return {k: clean_value(v) for k, v in val.items()}
    elif isinstance(val, list):
        return [clean_value(x) for x in val]
    elif isinstance(val, float):
        if math.isnan(val) or math.isinf(val):
            return None
        return val
    elif pd.isna(val):
        return None
    return val

print("Starting corrected data preprocessing with clean columns...")

# ==========================================
# 1. PROCESS DASHBOARD E-COMMERCE
# ==========================================
path_db = os.path.join(workspace_dir, "Dashboard E commerce.xlsx")
xl_db = pd.ExcelFile(path_db)

# Sheet 0: BD TIENDA JUNTA 2025 E-COMMERCE
df_tienda = xl_db.parse(xl_db.sheet_names[0])
df_tienda.columns = [clean_column_name(c) for c in df_tienda.columns]
# Standardize months to uppercase
df_tienda['MES'] = df_tienda['MES'].str.upper()
tienda_data = clean_value(df_tienda.to_dict(orient='records'))

# Sheet 1: VARIACION MES A MES E-COMMERCE
df_var = xl_db.parse(xl_db.sheet_names[1])
df_var.columns = [clean_column_name(c) for c in df_var.columns]
df_var['MES'] = df_var['MES'].str.upper()
var_data = clean_value(df_var.to_dict(orient='records'))

# Sheet 2: BD PRODUCTO E-COMMERCE JUNTA 20
df_prod = xl_db.parse(xl_db.sheet_names[2])
df_prod.columns = [clean_column_name(c) for c in df_prod.columns]
df_prod.rename(columns={'Cntro': 'Centro'}, inplace=True)
# Standardize months to uppercase!
df_prod['Mes'] = df_prod['Mes'].str.upper()
prod_data = clean_value(df_prod.to_dict(orient='records'))

# Write E-commerce datasets
with open(os.path.join(output_dir, "sales_summary.json"), 'w', encoding='utf-8') as f:
    json.dump(tienda_data, f, ensure_ascii=False, indent=2)

with open(os.path.join(output_dir, "sales_monthly.json"), 'w', encoding='utf-8') as f:
    json.dump(var_data, f, ensure_ascii=False, indent=2)

with open(os.path.join(output_dir, "sales_products.json"), 'w', encoding='utf-8') as f:
    json.dump(prod_data, f, ensure_ascii=False, indent=2)

print("E-commerce sales sheets preprocessed successfully.")

# ==========================================
# 2. PROCESS PRODUCTS & SKUS (ARTURO CALLE)
# ==========================================
path_sku = os.path.join(workspace_dir, "2026-06-04T15_48_03Z_products-and-skus_arturocalle.xlsx")
print("Reading large products-and-skus catalog... (this might take a few moments)")
df_sku = pd.read_excel(path_sku, sheet_name=0, header=1)
print("Finished reading. Total rows:", len(df_sku))

df_sku.columns = [clean_column_name(c) for c in df_sku.columns]

# Aggregated Stats
total_products = len(df_sku)
brand_counts = df_sku['Brand'].value_counts(dropna=False).to_dict()
dept_counts = df_sku['Department'].value_counts(dropna=False).to_dict()
cat_counts = df_sku['Category'].value_counts(dropna=False).head(30).to_dict()
active_counts = df_sku['Activeproduct'].value_counts(dropna=False).to_dict()

# SEO Analysis
has_meta_desc = df_sku['Metadescription'].notna().sum() if 'Metadescription' in df_sku.columns else df_sku['MetaDescription'].notna().sum() if 'MetaDescription' in df_sku.columns else 0
has_page_title = df_sku['PageTitle'].notna().sum() if 'PageTitle' in df_sku.columns else 0
has_url = df_sku['ProductURL'].notna().sum() if 'ProductURL' in df_sku.columns else 0

# Physical statistics (weights/dimensions)
weight_stats = {
    "avg_package_weight": float(df_sku['Packageweight'].mean()) if 'Packageweight' in df_sku.columns else 0.0,
    "avg_package_width": float(df_sku['Packagewidth'].mean()) if 'Packagewidth' in df_sku.columns else 0.0,
    "avg_package_height": float(df_sku['Packageheight'].mean()) if 'Packageheight' in df_sku.columns else 0.0,
    "avg_package_length": float(df_sku['Packagelength'].mean()) if 'Packagelength' in df_sku.columns else 0.0,
    "avg_actual_weight": float(df_sku['Actualweight'].mean()) if 'Actualweight' in df_sku.columns else 0.0,
    "avg_cubic_weight": float(df_sku['CubicWeight'].mean()) if 'CubicWeight' in df_sku.columns else 0.0,
}

catalog_stats = {
    "total_products": total_products,
    "active_counts": active_counts,
    "brand_counts": brand_counts,
    "dept_counts": dept_counts,
    "category_counts": cat_counts,
    "seo_stats": {
        "total": total_products,
        "has_meta_desc": int(has_meta_desc),
        "has_page_title": int(has_page_title),
        "has_url": int(has_url)
    },
    "physical_stats": weight_stats
}

with open(os.path.join(output_dir, "catalog_stats.json"), 'w', encoding='utf-8') as f:
    json.dump(clean_value(catalog_stats), f, ensure_ascii=False, indent=2)

print("Catalog aggregated stats written successfully.")

# Extract sample products for interactive catalog browsing/searching
sample_cols = [
    'ProductID', 'ProductName', 'Activeproduct', 'Description', 
    'Brand', 'Department', 'Category', 'ProductURL', 'SKUID', 'SKUname', 'ActiveSKU'
]
df_active = df_sku[df_sku['Activeproduct'] == 'Yes']

# Sample up to 3000 rows
df_sample = df_active.sample(n=min(3000, len(df_active)), random_state=42) if len(df_active) > 3000 else df_active
df_sample = df_sample[sample_cols].where(pd.notnull(df_sample[sample_cols]), None)
sample_data = clean_value(df_sample.to_dict(orient='records'))

with open(os.path.join(output_dir, "catalog_sample.json"), 'w', encoding='utf-8') as f:
    json.dump(sample_data, f, ensure_ascii=False, indent=2)

print(f"Catalog sample of {len(sample_data)} products written successfully.")
print("Preprocessing completed successfully!")
