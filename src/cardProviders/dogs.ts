import type { Face } from "../Face";
import type { CardProvider } from "./providers";
import { shuffle } from "./words";

export const dogs: CardProvider = {
  id: "dogs",
  label: "Dogs", group: 'photos', difficulty: 'brutal',
  icon: "🐶",
  description: "Dogs acting out HTTP status codes",
  source: "HTTP Dogs", sourceUrl: "https://http.dog",
  fetch,
};

const CODES: [number, string][] = [
  [100, "Continue"], [101, "Switching Protocols"], [102, "Processing"],
  [200, "OK"], [201, "Created"], [202, "Accepted"],
  [203, "Non-Authoritative Information"], [204, "No Content"],
  [206, "Partial Content"], [207, "Multi-Status"],
  [300, "Multiple Choices"], [301, "Moved Permanently"], [302, "Found"],
  [303, "See Other"], [304, "Not Modified"], [307, "Temporary Redirect"],
  [308, "Permanent Redirect"],
  [400, "Bad Request"], [401, "Unauthorized"], [402, "Payment Required"],
  [403, "Forbidden"], [404, "Not Found"], [405, "Method Not Allowed"],
  [406, "Not Acceptable"], [407, "Proxy Authentication Required"],
  [408, "Request Timeout"], [409, "Conflict"], [410, "Gone"],
  [411, "Length Required"], [412, "Precondition Failed"],
  [413, "Payload Too Large"], [414, "Request-URI Too Long"],
  [415, "Unsupported Media Type"], [416, "Requested Range Not Satisfiable"],
  [417, "Expectation Failed"], [418, "I'm a Teapot"],
  [421, "Misdirected Request"], [422, "Unprocessable Entity"], [423, "Locked"],
  [424, "Failed Dependency"], [425, "Too Early"], [426, "Upgrade Required"],
  [428, "Precondition Required"], [429, "Too Many Requests"],
  [431, "Request Header Fields Too Large"], [444, "No Response"],
  [450, "Blocked by Windows Parental Controls"],
  [451, "Unavailable For Legal Reasons"], [499, "Client Closed Request"],
  [500, "Internal Server Error"], [501, "Not Implemented"],
  [502, "Bad Gateway"], [503, "Service Unavailable"], [504, "Gateway Timeout"],
  [506, "Variant Also Negotiates"], [507, "Insufficient Storage"],
  [508, "Loop Detected"], [510, "Not Extended"],
  [511, "Network Authentication Required"],
  [599, "Network Connect Timeout Error"],
];

async function fetch(): Promise<Face[]> {
  return shuffle(CODES)
    .slice(0, 20)
    .map(([code, title]) => ({
      kind: "image",
      url: `https://http.dog/${code}.jpg`,
      fit: "framed",
      trim: 5,
      tooltip: title,
      link: `https://http.dog/${code}`,
    }));
}
