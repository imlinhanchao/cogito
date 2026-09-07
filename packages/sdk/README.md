# 鱼丸游戏平台 SDK

游戏平台集成 SDK，提供身份认证、云存档以及实时属性同步功能。

## 安装

```bash
npm install fishpi-play
```

## 快速开始

### 初始化

```typescript
import { GameSDK } from 'fishpi-play';

const sdk = new GameSDK('your_game_key');
```

### 身份认证

```typescript
// 1. 初始化认证（处理回调 URL 中的登录信息）
await sdk.initAuth();

// 2. 检查登录状态
if (!await sdk.isAuthenticated()) {
    // 3. 跳转登录
    sdk.login(window.location.href);
}

// 4. 获取用户信息
const user = await sdk.getUserProfile();
console.log('Welcome, ' + user.nickname);

// 5. 登出
sdk.logout();
```

### 云存档

```typescript
// 上传存档
await sdk.saveArchive(JSON.stringify({ score: 100 }));

// 获取存档
const archive = await sdk.getArchive();
if (archive) {
    console.log('Last saved at:', archive.updatedAt);
    const data = JSON.parse(archive.content);
}
```

### 实时属性同步 (WebSocket)

```typescript
// 连接实时消息服务
sdk.connectRealtime((msg) => {
    console.log('Received message:', msg);
});

// 设置属性
sdk.setAttributes({ status: 'in-game', level: 5 });

// 获取当前属性
const attrs = sdk.getAttributes();
```

## API 参考

### `GameSDK`

#### `constructor(gameKey: string, baseUrl?: string)`
初始化 SDK 实例。`baseUrl` 默认为 `http://play.adventext.fun`。

#### `login(redirectUri?: string): Promise<void>`
跳转至平台登录页面。

#### `logout(): Promise<void>`
清除本地 token，退出登录。

#### `initAuth(): Promise<boolean>`
尝试从当前页面 URL 解析验证信息。如果验证成功，将自动存储 Token 并返回 `true`。

#### `isAuthenticated(): Promise<boolean>`
检查当前 Token 是否有效并返回用户信息。

#### `getToken(): string | null`
获取当前存储的授权 Token。

#### `setToken(token: string): void`
手动设置授权 Token（例如从其他存储恢复时）。

#### `getUserProfile(): Promise<UserInfo>`
获取当前登录用户的详细信息。

#### `saveArchive(content: string): Promise<void>`
保存字符串格式的存档数据到云端。

#### `getArchive(): Promise<{ content: string; updatedAt: string } | null>`
获取云端存档及其更新时间。

#### `connectRealtime(onMessage?: (data: any) => void): void`
通过 WebSocket 连接实时同步服务。

#### `setAttributes(attributes: Record<string, any>): void`
设置当前用户的实时属性（如状态、位置等）。

#### `getAttributes(): Record<string, any>`
获取已同步的用户实时属性。

#### `getOtherDevices(): void`
请求获取当前账号在其他设备上的登录信息（通过 WebSocket 返回数据）。

#### `getOnlineUsers(): Promise<OnlineUser[]>`
按 `userId` 去重返回在线用户列表，每个 `OnlineUser` 包含用户信息及其所有在线设备（`devices`）。

#### `getOnlineClients(): Promise<OnlineClient[]>`
返回所有在线客户端（每台设备视为一个客户端），包含所属用户信息与设备属性。

#### `getOnlineClientsByUser(userId: string): Promise<OnlineClient[]>`
获取指定用户的在线客户端列表，参数 `userId` 为用户 ID，返回该用户所有在线客户端信息数组。

#### `sendToUsers(userIds: string[], event: string, payload: any): Promise<SendResult>`
向指定用户 ID 列表发送带事件类型的消息，`userIds` 为目标用户 ID 列表，`event` 为消息事件类型，`payload` 为消息内容。返回 `SendResult`，包含成功发送的连接数量 `sent`。

#### `sendToClients(clientIds: string[], payload: any): Promise<SendResult>`
向指定客户端 ID 列表发送消息。`clientIds` 为目标客户端 ID 列表，`payload` 为要发送的消息内容，返回对象包含已发送的数量 `sent`。

#### `on(event: string, callback: (data: any) => void): () => void`
监听指定事件类型的实时消息，返回一个取消监听的函数。常用于订阅自定义事件消息。

#### `off(event: string, callback: (data: any) => void): void`
取消订阅指定事件类型的回调。

## 类型定义

### `UserInfo`

```typescript
interface UserInfo {
    id: string;       // 用户唯一 ID
    username: string; // 用户名
    nickname: string; // 昵称
    avatar: string;   // 头像 URL
    isAdmin: boolean; // 是否为管理员
}

### `OnlineDevice`

```typescript
interface OnlineDevice {
    clientId: string; // 设备连接 ID
    attributes: any;  // 设备属性
}
```

### `OnlineClient`

```typescript
interface OnlineClient extends UserInfo {
    clientId: string; // 设备连接 ID
    attributes: any;  // 设备属性
}
```

### `OnlineUser`

```typescript
interface OnlineUser extends OnlineClient {
    devices: OnlineDevice[]; // 用户的所有在线设备
}
```

### `SendResult`

```typescript
interface SendResult {
    sent: number; // 成功发送的连接数量
}
```
```
