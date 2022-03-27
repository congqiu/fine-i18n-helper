# fine-i18n-helper README

这是一个用于在vscode上对国际化进行辅助增强的工具

## 功能点

- [x] hover国际化key显示提示
- [x] 点击国际化key或hover后点击显示的值跳转到定义位置
- [x] 格式化选中文案（简单替换，没有语法支持）
- [x] 格式化整个文件（只测试了tsx，ast转换后用prettier格式化，如不符合eslint需要手动lint）
- [x] 当前文件显示全部国际化后的值
- [x] 当前文件可以搜索国际化后值跳转
- [ ] 支持多种格式的国际化存储文件
- [ ] 支持import
- [ ] 支持切换翻译源

## 配置项

### vscode配置项

#### 通用配置项

- localesPath: 国际化文件所在文件夹
- mainLocale: 国际化基准文件
- functionName: 国际化调用的方法名
- prefix: 自动生成key的前缀

#### vscode专属配置项

- multiRootTip: 是否显示Multi-root工作区提示，一般情况下不需要配置
- hoverLocales: 定义hover显示的翻译值，为空字符串显示全部，为null则不显示
- showDecorations: 是否在当前文件显示key的翻译值
- transformOnSave: 是否保存文件的时候自动翻译
- definitions: 定义key可跳转的i18n文件
- showWorkbench: 转换当前文件时是否显示工作台，如不显示则直接转换

### 配置文件

支持`i18n.config.js`或`.i18nrc`或`.i18nrc.json`或`.i18nrc.yml`等[cosmiconfig](https://github.com/davidtheclark/cosmiconfig)风格的配置文件，同一配置文件可以直接修改生效，如果配置文件类型发生改变请重启工程。

可以通过命令面板执行`初始化国际化配置文件`来初始化一个默认的配置文件，配置文件优先级高于vscode配置项，vscode专属配置项不建议写入配置文件导致vscode配置无法生效。

#### 配置文件专属配置项

- entry: 转换工作区指定文件的入口，默认`src`
- exclude: 转换工作区指定文件时排除的文件，默认`[]`
- decoratorsBeforeExport: babel转换时候的参数，默认为`true`
- judgeText: 匹配要被国际化的内容，默认为`/[\u4e00-\u9fa5]/`

## 开发

```sh
git clone https://github.com/congqiu/fine-i18n-helper.git
```

下载代码，安装依赖后，执行`yarn watch`，再使用vscode调用F5即可进入调试模式。更多信息参考[vsc-extension-quickstart](vsc-extension-quickstart.md)或[官方文档](https://code.visualstudio.com/api)了解VS Code的extension开发。
