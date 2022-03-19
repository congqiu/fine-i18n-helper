import * as fs from "fs";

import { Row, writeToStream } from "@fast-csv/format";
import { parse } from "@fast-csv/parse";
import * as chardet from "chardet";
import * as iconv from "iconv-lite";

import { TLocales } from "./types";

const I18N_VALUE_KEY = "i18n";
export const json2csv = (
  csvPath: string,
  mainLocalesData: TLocales,
  languageData: TLocales
) => {
  const rows: Row[] = [];
  Object.keys(mainLocalesData).forEach((key) => {
    if (!languageData[key]) {
      rows.push({
        key,
        main: mainLocalesData[key]?.replace(/[\n]/g, "\\n"),
        [I18N_VALUE_KEY]: languageData[key]?.replace(/[\n]/g, "\\n") || "",
      });
    }
  });
  writeToStream(fs.createWriteStream(csvPath), rows, {
    headers: true,
    writeBOM: true,
  });
};

export const csv2json = (
  csvPath: string,
  mainLocalesData: TLocales,
  languageData: TLocales
): Promise<TLocales> => {
  return new Promise((resolve, reject) => {
    fs.createReadStream(csvPath)
      .pipe(iconv.decodeStream(chardet.detectFileSync(csvPath) as string))
      .pipe(iconv.encodeStream("utf8"))
      .pipe(
        parse({
          headers: true,
          encoding: "utf8",
        })
      )
      .on("error", reject)
      .on("data", (row) => {
        if (
          mainLocalesData[row.key] !== undefined &&
          row[I18N_VALUE_KEY] !== undefined
        ) {
          languageData[row.key] = row[I18N_VALUE_KEY]?.replace(/\\n/g, "\n");
        }
      })
      .on("end", () => {
        resolve(languageData);
      });
  });
};
