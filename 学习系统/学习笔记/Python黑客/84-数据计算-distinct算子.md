### distinnct算子
**功能**：
	对RDD数据进行去重，返回新RDD
**语法**：
```Python
rdd.distinct()        # 无需传参
```

**代码编写**
```Python
# 导包  
from pyspark import SparkConf,SparkContext  
  
conf = SparkConf().setMaster("local[*]").setAppName("distinct_app")  
sc = SparkContext(conf=conf)  
  
# 准备一个rdd值  
rdd = sc.parallelize([1,1,3,3,6,6,7,9,10])  
  
# 对rdd的数据进行去重  
rdd2 = rdd.distinct()  
print(rdd2.collect())
```