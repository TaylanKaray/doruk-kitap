# Backend Kurulumu

## Gereksinimler
- Node.js
- MongoDB (lokalde veya bulutta çalışabilir)

## Kurulum
1. `npm install` komutunu çalıştırın.
2. Proje kök dizininde bir `.env` dosyası oluşturun ve aşağıdaki satırları ekleyin:

```
MONGO_URI=mongodb://localhost:27017/projeDB
PORT=5000
```

## Çalıştırma

```
npm start
```

Sunucu varsayılan olarak 5000 portunda çalışacaktır.

## Test

Tarayıcıda veya Postman ile `http://localhost:5000/` adresine istek atarak "Backend API çalışıyor!" mesajını görebilirsiniz. 