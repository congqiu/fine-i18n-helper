# fine-i18n-helper README

这是一个用于在vscode上对国际化进行辅助增强的工具

## 功能点

- [x] hover国际化key显示提示
- [x] 点击国际化key或hover后显示的值跳转到定义位置
- [x] 格式化选中中文（简单替换，没有语法支持）
- [x] 格式化整个文件（只测试了tsx，ast转换后用prettier格式化，如不符合eslint需要手动lint）
- [x] 当前文件显示全部国际化后的值
- [x] 当前文件可以搜索国际化后值跳转
- [ ] 支持多种格式的国际化存储文件
- [ ] 支持import

## 配置项

### vscode配置项

- multiRootTip: 是否显示Multi-root工作区提示，一般情况下不需要配置
- localesPath: 国际化文件所在文件夹，默认为`src/locales`
- locales: 支持的国际化文件，第一个为基准文件，如为空则文件夹第一个为基准文件
- functionName: i18n的方法名，默认为`i18n.get`
- prefix: 国际化key的前缀，默认为空
- hoverLocales: 定义hover显示的翻译值，默认或为空字符串显示全部，为null则不显示
- showDecorations: 是否在当前文件显示key的翻译值
- transformOnSave: 是否保存文件的时候自动翻译
- definitions: 定义key可跳转的i18n文件，默认全部

### 配置文件

支持`i18n.config.js`或`.i18nrc`或`.i18nrc.json`或`.i18nrc.yml`等[cosmiconfig](https://github.com/davidtheclark/cosmiconfig)风格的配置文件，同一配置文件可以直接修改生效，如果配置文件类型发生改变请重启工程。

可以通过命令面板执行`Init I18n Config File`来初始化一个默认的配置文件。
