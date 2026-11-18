继kali之后要做的事情...
### 前置
```
# 安装虚拟环境工具
sudo apt install python3-venv -y

# 创建虚拟环境目录
cd ~
python3 -m venv jupyter_env

# 激活虚拟环境
source jupyter_env/bin/activate

# 现在安装 Jupyter
pip install jupyter pandas matplotlib

# 启动 Jupyter
jupyter-notebook --ip=0.0.0.0 --port=8888 --no-browser
```
