### 动态柱状图

#### 案例效果

![](./附件/48-Python基础柱状图构建-2026-08-05-13-12-44.png)

**通过Bar构建基础柱状图**


![](./附件/48-Python基础柱状图构建-2026-08-05-13-14-06.png)

```python
import pyecharts  
from pyecharts.charts import Bar  
  
# 使用Bar构建基础柱状图  
bar_image = Bar()  
  
# 田间xy轴数据  
bar_image.add_xaxis(["中国","美国","英国"])  
bar_image.add_yaxis("GDP",[30,20,10])  
  
# 绘图  
bar_image.render("基础柱状图.html")
```

![](./附件/48-Python基础柱状图构建-2026-08-05-13-21-02.png)

### 反转xy轴

![](./附件/48-Python基础柱状图构建-2026-08-05-13-21-32.png)

### 数值标签在右侧

![](./附件/48-Python基础柱状图构建-2026-08-05-13-22-57.png)

