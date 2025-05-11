// index.js
import express from 'express';      // ES 모듈 쓰시려면 package.json에 "type":"module" 추가
import path from 'path';

const app = express();
const PORT = process.env.PORT || 3000;

// 정적 파일(HTML, CSS, JS, img) 있는 폴더 지정
app.use(express.static(path.join(process.cwd(), '/')));

// SPA나 404 핸들링이 필요하다면:
app.get('*', (req, res) => {
  res.sendFile(path.join(process.cwd(), '/index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
