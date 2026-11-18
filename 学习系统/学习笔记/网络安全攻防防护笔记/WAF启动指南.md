

# 🔄 WAF 环境启动指南

## 📋 **快速启动命令**

### 1. **检查服务状态**

```
bash

# 检查 Nginx 是否在运行
ps aux | grep nginx

# 或者使用 systemctl（如果配置了服务）
systemctl status nginx
```

### 2. **启动 WAF 环境**

```
bash

# 如果 Nginx 未运行，启动它
nginx

# 如果配置了系统服务
systemctl start nginx
```

### 3. **验证启动状态**

```
bash

# 测试正常访问
curl -I http://192.168.10.104/

# 测试 WAF 防护
curl -I "http://192.168.10.104/?id=1' UNION SELECT 1,2,3--"
```

---

## 🛠️ **日常管理命令**

### **启动/停止/重启**

```
bash

# 启动
nginx

# 停止
nginx -s stop

# 优雅停止（处理完当前请求）
nginx -s quit

# 重启
nginx -s reload

# 强制重启
nginx -s stop && nginx
```

### **配置检查**

```
bash

# 检查配置文件语法
nginx -t

# 检查包含 ModSecurity 模块
nginx -V 2>&1 | grep modsecurity
```

### **日志查看**

```
bash

# 实时查看攻击拦截日志
tail -f /var/log/nginx/modsec_audit.log

# 查看访问日志
tail -f /var/log/nginx/access.log

# 查看错误日志
tail -f /var/log/nginx/error.log
```