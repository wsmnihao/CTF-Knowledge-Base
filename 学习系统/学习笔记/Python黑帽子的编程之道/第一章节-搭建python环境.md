### 1、搭建kali系统的python环境
注解：
	提前装好kali系统，做好网路配置，确保能ping通外网以及两塔物理机和虚拟机能互相ping通
```python
	python --version    %% 检查python版本，下面的也是%%
	python -V
```
正常来说会弹出系统版本号，会默认安装的。书上的是2.7的，已经过时了，用python3的即可。

### 2、安装包管理工具
```bash
	apt-get install python-setuptools python-pip %% 这个是2.7版本用的，现在都是py3了，这个命令就不用了，用下面的这个就行 %%
	


# 安装 Python 3 的 pip 和 setuptools
	sudo apt install python3-pip python3-setuptools -y

# 验证安装
	pip3 --version
	python3 -m pip --version```

### 2、创建专属虚拟环境
python2的那个已经不是配了，现在python3的强制需要创建个虚拟环境！！
```python
	# 1. 创建项目目录（建议放在/opt或你的家目录）
	mkdir -p /opt/blackhat_labs  # 或 mkdir ~/blackhat_labs
	cd /opt/blackhat_labs
	
	# 2. 创建虚拟环境（命名为 venv 或 py3env）
	python3 -m venv py3env
	
	# 3. 激活虚拟环境（最关键的一步！） 如果看到py3env的前缀，那就是成功激活了
	source py3env/bin/activate
```

### 3、激活之后立即验证
```bash
	# 1. 检查Python和pip是否指向虚拟环境内部
	which python  # 应该显示: /home/kali/blackhat_labs/py3env/bin/python
	which pip     # 应该显示: /home/kali/blackhat_labs/py3env/bin/pip
	
	# 2. 检查版本
	python --version  # 应该是 Python 3.13.x
	pip --version     # 应该是 pip 25.x
	
	# 3. 安装《黑帽子》核心库（在虚拟环境内是安全的！）
	pip install scapy-python3 requests colorama -i https://pypi.tuna.tsinghua.edu.cn/simple
	
	# 4. 终极验证
	python -c "import scapy.all as scapy; import requests; print('🎉 环境完美！可以开始学习《Python黑帽子》了。')"
	# 我的报错了，是scapy的包过时了，得重新卸载这个包再更新
	
	
	# 
	# 1. 卸载过时的 scapy-python3
	pip uninstall scapy-python3 -y
	
	# 2. 安装主流且支持Python 3的 scapy
	pip install scapy
	
	# 3. 验证安装
	python -c "import scapy.all; print('✅ 正确版本的Scapy安装成功！版本:', scapy.__version__)"
	
	# 3.验证其他库，保证其他的库正常运行
	python -c "import requests; print('✅ Requests 就绪'); import colorama; print('✅ Colorama 就绪')"
	
	
	# 修复scapy
	# 1. 卸载过时的包，如果显示不存在就下一步
	pip uninstall scapy-python3 -y
	
	# 2. 安装正确的、主流的Scapy
	pip install scapy -i https://pypi.tuna.tsinghua.edu.cn/simple
	
	# 3. 验证（这是最关键的一步！）
	python -c "import scapy.all; print('✅ 正确Scapy安装成功！版本:', scapy.__version__)"
```

### 4、搭建代码环境
##### 搭建vscode
```bash
	# 方法1：使用官方仓库（推荐）
	sudo apt update
	sudo apt install -y curl gpg
	curl -sSL https://packages.microsoft.com/keys/microsoft.asc | sudo gpg --dearmor -o /usr/share/keyrings/microsoft-archive-keyring.gpg
	echo "deb [arch=amd64 signed-by=/usr/share/keyrings/microsoft-archive-keyring.gpg] https://packages.microsoft.com/repos/code stable main" | sudo tee /etc/apt/sources.list.d/vscode.list
	sudo apt update
	sudo apt install -y code
	
	# 方法2：如果上面不行，用下载deb包
	wget -O code.deb "https://code.visualstudio.com/sha/download?build=stable&os=linux-deb-x64"
	sudo dpkg -i code.deb
	sudo apt install -f
```

#### 启动vscode并安装必要扩展
```bash
	# 启动VSCode
	code
```
##### 在vscode安装这些...

| 扩展ID                     | 作用         |
| ------------------------ | ---------- |
| ms-python.python         | Python支持   |
| ms-python.vscode-pylance | 高级Python特性 |
| ms-toolsai.jupyter       | Jupyter支持  |
| eamodio.gitlens          | Git增强      |
| github.copilot           | AI辅助（可选）   |
#### 安装基础依赖
`pip install scapy requests beautifulsoup4 paramiko netaddr`

### 5、创建项目结构
#### 1、在vscode打开项目
```python
	# 使用VSCode打开项目目录
	code ~/blackhat_labs
```
#### 2、创建目录结构

```bash
blackhat_labs/
├── chapter_01/          # 第1章已完成
│   └── scapy_test.py
├── chapter_02/          # 第2章：网络嗅探
│   ├── __init__.py
│   ├── arp_spoof.py
│   ├── sniffer.py
│   └── packet_parser.py
├── chapter_03/          # 第3章：网络攻击
│   ├── tcp_client.py
│   ├── tcp_server.py
│   └── netcat_replacement.py
├── utils/               # 通用工具
│   ├── __init__.py
│   └── helpers.py
├── requirements.txt     # 依赖库列表
└── README.md           # 项目说明
```

#### 3、创建requirements.txt
```bash
# 生成当前环境的依赖列表
pip freeze > requirements.txt

# 添加书中需要的其他库
echo "scapy==2.5.0" >> requirements.txt
echo "requests==2.31.0" >> requirements.txt
echo "beautifulsoup4==4.12.2" >> requirements.txt
echo "paramiko==3.3.1" >> requirements.txt
echo "netaddr==0.9.0" >> requirements.txt
echo "pylint==3.0.3" >> requirements.txt
```

#### 4、配置python解释器
```bash
在VSCode中：

1. 按 `Ctrl+Shift+P`
    
2. 输入 `Python: Select Interpreter`
    
3. 选择 `~/blackhat_labs/blackhat_env/bin/python`
```

#### 5、测试环境
在vscode中创建test_env.py
```python
#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Python黑帽子 - 环境测试
"""

import sys
import scapy.all as scapy
import requests

def test_environment():
    """测试所有必要库是否正常"""
    
    print("=" * 50)
    print("Python黑帽子 - 环境测试")
    print("=" * 50)
    
    # 1. 测试Python版本
    print(f"\n[1] Python版本: {sys.version}")
    
    # 2. 测试Scapy
    try:
        print(f"[2] Scapy版本: {scapy.__version__}")
        # 创建一个简单的数据包
        packet = scapy.IP(dst="8.8.8.8")/scapy.ICMP()
        print(f"    Scapy数据包创建成功: {packet.summary()}")
    except Exception as e:
        print(f"    Scapy测试失败: {e}")
    
    # 3. 测试requests
    try:
        response = requests.get("http://httpbin.org/get", timeout=5)
        print(f"[3] Requests测试: 状态码 {response.status_code}")
    except Exception as e:
        print(f"    Requests测试失败: {e}")
    
    # 4. 测试网络权限
    print(f"\n[4] 用户权限: {'root' if os.geteuid() == 0 else '普通用户'}")
    print("    注意: 很多网络操作需要sudo权限")
    
    print("\n" + "=" * 50)
    print("环境测试完成！可以开始学习了！")
    print("=" * 50)

if __name__ == "__main__":
    import os
    test_environment()
```