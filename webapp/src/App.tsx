import { Button, Card, Checkbox, Input, List } from "antd";
import { CheckboxChangeEvent } from "antd/lib/checkbox";
import { useLayoutEffect, useState } from "react";

import "antd/dist/antd.compact.css";
import "./App.css";

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

const vscode = window.acquireVsCodeApi();
export const App = () => {
  const [texts, setTexts] = useState<THandledText[]>([]);
  const [loading, setLoading] = useState(false);

  useLayoutEffect(() => {
    sendMessage(EventTypes.READY);
    window.addEventListener("message", (event) => {
      const message = event.data;
      switch (message.type) {
        case EventTypes.CONFIG:
          setTexts(message.data.texts);
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

  const handleValue = (
    e: React.ChangeEvent<HTMLInputElement>,
    index: number
  ) => {
    const newTexts = [...texts];
    newTexts[index].key = e.target.value;
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
        dataSource={texts}
        renderItem={(text, index) => (
          <List.Item>
            <Card>
              <div>{text.text}</div>
              <Input
                placeholder="请输入国际化的key"
                disabled={text.exist && !text.override}
                value={text.key}
                onChange={(e) => handleValue(e, index)}
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
          提交并修改文件
        </Button>
        <Button disabled={loading} onClick={() => handleSave(false)}>
          只提交到国际化文件中
        </Button>
      </div>
    </div>
  );
};
