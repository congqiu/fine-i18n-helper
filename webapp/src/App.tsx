import { Button, Card, Checkbox, Empty, List } from "antd";
import { CheckboxChangeEvent } from "antd/lib/checkbox";
import { useLayoutEffect, useState } from "react";

import "antd/dist/antd.compact.css";
import "./App.css";
import { Input } from "./Components/Input";

export enum EventTypes {
  READY, // 面板初始化完成
  CONFIG, // 发送配置信息
  SAVE, // 保存
  CANCEL, // 取消
  FOCUS, // 面板中选中某个文本进行操作时
}

export interface THandledText {
  text: string;
  key: string;
  exist: boolean;
  override?: boolean;
}

const vscode = window.acquireVsCodeApi?.();
export const App = () => {
  const [texts, setTexts] = useState<THandledText[]>([]);
  const [keys, setKeys] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [filename, setFilename] = useState("");

  useLayoutEffect(() => {
    sendMessage(EventTypes.READY);
    window.addEventListener("message", (event) => {
      const message = event.data;
      switch (message.type) {
        case EventTypes.CONFIG:
          setTexts(message.data.texts);
          setKeys(message.data.keys);
          setFilename(message.data.filename);
          break;
        default:
          break;
      }
    });
  }, []);

  const handleSave = (transform: boolean) => {
    sendMessage(EventTypes.SAVE, { transform, texts });
    setLoading(true);
  };

  const sendMessage = (type: EventTypes, data: any = {}) => {
    vscode.postMessage({
      type,
      data,
    });
  };

  const handleValue = (value: string, index: number) => {
    const newTexts = [...texts];
    newTexts[index].key = value;
    setTexts(newTexts);
  };

  const handleOverride = (e: CheckboxChangeEvent, index: number) => {
    const newTexts = [...texts];
    newTexts[index].override = e.target.checked;
    setTexts(newTexts);
  };

  return (
    <div className="app">
      <List
        itemLayout="vertical"
        size="large"
        header={`请转换：${filename}`}
        dataSource={texts}
        locale={{ emptyText: <Empty description="没有需要处理的国际化" /> }}
        renderItem={(text, index) => (
          <List.Item>
            <Card bordered={false}>
              <div>{text.text}</div>
              <Input
                placeholder="请输入国际化的key"
                disabled={text.exist && !text.override}
                value={text.key}
                rules={[
                  {
                    required: true,
                    message: "国际化的key不能为空",
                  },
                  {
                    validate: (value) =>
                      !keys.some((key) => key === value && text.key !== key),
                    message: `当前key已存在，请重新输入`,
                  },
                ]}
                onChange={(v) => handleValue(v, index)}
                onFocus={() => sendMessage(EventTypes.FOCUS, { index })}
              />
              {text.exist ? (
                <Checkbox
                  checked={text.override}
                  onChange={(e) => handleOverride(e, index)}
                >
                  设置不同的key？
                </Checkbox>
              ) : undefined}
            </Card>
          </List.Item>
        )}
      />
      <div className="buttons">
        <Button onClick={() => sendMessage(EventTypes.CANCEL)}>取消</Button>
        <Button disabled={loading} onClick={() => handleSave(true)}>
          保存并修改文件
        </Button>
        <Button disabled={loading} onClick={() => handleSave(false)}>
          只保存国际化信息
        </Button>
      </div>
    </div>
  );
};
