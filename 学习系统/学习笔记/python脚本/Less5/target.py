vuln_exists = check_vulnerabilty("http://127.0.0.1")

if vuln_exists:
    print(f"[+]有漏洞可利用渗透测试")
else:
    print(f"[-]很遗憾，没有漏洞可进行渗透测试！")