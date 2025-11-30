注：NAT主要实现公私IP地址的转换，一般是路由器或者防火墙上来完成，不建议在三层交换机上配置！
### nat类型
#### 静态nat
1对1映射，静态PAT，端口映射技术
#### 动态nat
#### PAT
端口地址转换，Port Address Translations。PAT也成为端口复用技术
### 配置PAT：
#### 定义内网端口
int f0/0
	ip nat insie
	exit
即：f0/0接口被定义成内网nat接口
#### 定义外网端口
int f0/1
	ip nat outside
	exit
即：f0/1接口被定义为外网nat接口
#### 配置转换关系
#### 定义内部地址池：
	acc 1 permit 192.168.0.0 0.0.255.255
#### 做PAT动态映射：
	conf t
	ip nat inside source list 1 int f0/1 overload
#### 配置静态端口转换
	conf t
	ip nat inside source static tcp 192.168.1.3 80 100.1.1.2 80