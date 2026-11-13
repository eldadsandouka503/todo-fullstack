/** 携带 HTTP 状态码的业务错误；统一错误中间件读 .status 决定响应码。 */
export class HttpError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}
