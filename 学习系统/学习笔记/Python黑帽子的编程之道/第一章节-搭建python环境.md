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
	# 1. 创建项目目录（建议放在家目录，避免权限问题）
mkdir -p ~/blackhat_labs
cd ~/blackhat_labs

# 2. 创建虚拟环境（统一命名为 py3env，和后面步骤对应）
python3 -m venv py3env

# 3. 激活虚拟环境（最关键！终端提示符前应有 (py3env)）
source py3env/bin/activate
```

### 3、激活之后立即验证
```python
# 1. 检查Python和pip是否指向虚拟环境内部
	which python  # 应该显示: /home/kali/blackhat_labs/py3env/bin/python
	which pip     # 应该显示: /home/kali/blackhat_labs/py3env/bin/pip
	
# 2. 检查版本
	python --version  # 应该是 Python 3.13.x
	pip --version     # 应该是 pip 25.x
	
# 确保你在 (py3env) 下执行！一次性安装所有正确库。
# 使用清华镜像加速，避免网络问题。
	pip install scapy requests beautifulsoup4 paramiko netaddr colorama -i https://pypi.tuna.tsinghua.edu.cn/simple --trusted-host pypi.tuna.tsinghua.edu.cn
	
# 4. 终极验证
	python -c "import scapy.all; print('✅ Scapy版本:', scapy.__version__)"
	
# 5. 验证安装
	python -c "import scapy.all; print('✅ 正确版本的Scapy安装成功！版本:', scapy.__version__)"
	
# 6.验证其他库，保证其他的库正常运行
	python -c "import requests; print('✅ Requests 就绪'); import colorama; print('✅ Colorama 就绪')"
```

### 4、搭建代码环境
##### 搭建vscode
```python
	# 1. 首先，完全卸载任何可能残留的旧版本（确保干净）
sudo apt remove --purge code -y
sudo apt autoremove -y
# 清理用户配置（非常重要，解决你之前的“激活”问题）
rm -rf ~/.vscode ~/.config/Code

# 2. 安装VSCode（采用最可靠的“下载deb包”方式，避免仓库冲突）
wget -O /tmp/vscode_latest.deb "https://code.visualstudio.com/sha/download?build=stable&os=linux-deb-x64"
sudo dpkg -i /tmp/vscode_latest.deb
# 修复安装时可能缺失的依赖
sudo apt --fix-broken install -y

# 3. 启动VSCode并打开你的项目（--new-window确保新窗口）
code ~/blackhat_labs --new-window &
```

#### 启动vscode并安装必要扩展
```bash
	# 启动VSCode
	code .
```
##### 在vscode安装这些...

| 扩展ID                     | 作用         |
| ------------------------ | ---------- |
| ms-python.python         | Python支持   |
| ms-python.vscode-pylance | 高级Python特性 |
| ms-toolsai.jupyter       | Jupyter支持  |
| eamodio.gitlens          | Git增强      |
| github.copilot           | AI辅助（可选）   |

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
├── chapter_02/          # 第2章：网络嗅探
├── chapter_03/          # 第3章：网络攻击
├── utils/               # 通用工具
├── requirements.txt     # 依赖库列表
└── README.md           # 项目说明
```

#### 3、配置python解释器
```bash
在VSCode中：

1. 按 `Ctrl+Shift+P`
    
2. 输入 `Python: Select Interpreter`
    
3. 选择 `~/blackhat_labs/py3env/bin/python`
```

#### 4、日常使用流程！！！
```python
# 1. 首先，进入项目目录
cd ~/blackhat_labs

# 2. 然后，激活虚拟环境（最重要！你会看到 (py3env) 前缀）
source py3env/bin/activate

# 3. 接着，在【已激活环境的状态下】用VSCode打开项目
code .  # 这个点“.”代表当前目录（~/blackhat_labs）
```