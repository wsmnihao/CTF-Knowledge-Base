 # 一、安装并配置WAF
这里用的centos
记得安装系统
1、安装相关工具
```
yum install -y wget epel-release
```
![[屏幕截图 2025-11-09 100425.png]]
2、安装依赖工具
```
sudo dnf install -y httpd httpd-devel libxml2-devel gcc curl-devel
sudo dnf install -y pcre2 pcre2-devel
sudo dnf install -y epel-release
sudo dnf install -y compat-lua-devel
注：包时间久了可能会更新，如果没找到匹配项应该是改名称了，我的是lua的没安装好，用的是这个命令查询的
dnf search lua | grep -i devel
```
3、编译Modsecurity
提前下好modsecurity2.9.3.tar.gz的包
放在/usr/local的文件夹里面
```
cp /home/w/modsecurity-v2.9.3.tar.gz /usr/local
```
	解压
```
	pwd   #当前路径是/home/w
	cd /usr/local
	tar -zxvf modsecurity-v2.9.3.tar.gz 
```
	编译
```
cd /usr/local/modsecurity-v2.9.3
./configure --enable-standalone-module --disable-mlogc
```
安装编译
```
make
```
---
如果上述有一个不对，就按下面的来，软件包也换成了3.0.14的，如果解压报错，就重新下一遍
yum install -y epel-release
yum install -y httpd httpd-devel
yum install -y pcre2 pcre2-devel
yum install -y libxml2-devel gcc lua-devel yajl-devel ssdeep-devel curl-devel