# ESS项目信息管理系统

这是一个使用原生JavaScript和Cheetah Grid实现的项目信息管理系统。

## 功能特点

- 使用Cheetah Grid显示和编辑项目数据
- 通过treeql接口与API交互
- 支持添加、编辑和保存项目信息
- 响应式设计，适应不同屏幕尺寸

## 技术栈

- 原生JavaScript
- Cheetah Grid - 用于表格显示和编辑
- Fetch API - 用于与后端API交互

## API接口

系统通过以下API接口获取和保存数据：
- `https://oska-api.yunxing.hu/records/ess_projects`

## 使用方法

1. 打开`index.html`文件
2. 点击"添加项目"按钮可以添加新项目
3. 直接在表格中编辑项目信息
4. 点击"保存更改"按钮保存修改
5. 点击"刷新数据"按钮重新加载数据

## 项目结构

```
ess-refs/
├── index.html      # 主页面
├── js/
│   └── app.js      # 应用逻辑
└── README.md       # 项目说明
``` 