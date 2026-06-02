# HumaPet Social

Protótipo front-end de rede social pet do ecossistema **HumaPet**, conectando pets, tutores, cuidados, adoção, serviços e comunidades.

## Tecnologias

- HTML5
- CSS3 puro
- JavaScript puro
- Firebase Web SDK via CDN
- Firebase Authentication
- Cloud Firestore
- Fallback local com `localStorage` e IndexedDB quando o Firebase não está configurado

## Firebase nesta fase

O projeto usa **Firebase Authentication** e **Cloud Firestore**.

O **Firebase Storage não está em uso nesta fase**, porque pode exigir upgrade para o plano Blaze. Por isso, os posts reais no Firestore usam cards visuais com:

- legenda
- categoria
- emoji
- título visual
- nome do pet
- nome do tutor
- username
- data de criação

Upload real de imagem/vídeo fica preparado como etapa futura.

## Funcionalidades

- Cadastro com email e senha
- Login e logout
- Documento de perfil em `users/{uid}`
- Perfil do tutor e pet salvo no Firestore
- Feed em tempo real com `onSnapshot`
- Criação de posts reais no Firestore
- Curtidas por usuário em `posts/{postId}/likes/{uid}`
- Comentários em `posts/{postId}/comments`
- Posts salvos em `users/{uid}/savedPosts/{postId}`
- Stories, Reels, adoção, serviços e comunidades seguem mockados nesta fase

## Configuração

Cole o config do seu app Web Firebase em `assets/js/firebase.js`:

```js
const firebaseConfig = {
  apiKey: "COLE_SUA_API_KEY_AQUI",
  authDomain: "COLE_SEU_AUTH_DOMAIN_AQUI",
  projectId: "COLE_SEU_PROJECT_ID_AQUI",
  messagingSenderId: "COLE_SEU_MESSAGING_SENDER_ID_AQUI",
  appId: "COLE_SEU_APP_ID_AQUI"
};
```

Ative no Firebase Console:

- Authentication com provedor Email/senha
- Cloud Firestore

Não é necessário ativar Storage para esta versão.

## Regras Firestore para desenvolvimento

```txt
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /posts/{postId} {
      allow read: if true;
      allow create: if request.auth != null;
      allow update: if request.auth != null;
      allow delete: if request.auth != null && request.auth.uid == resource.data.uid;

      match /likes/{userId} {
        allow read: if true;
        allow write: if request.auth != null && request.auth.uid == userId;
      }

      match /comments/{commentId} {
        allow read: if true;
        allow create: if request.auth != null;
      }
    }

    match /users/{userId} {
      allow read: if true;
      allow create, update: if request.auth != null && request.auth.uid == userId;

      match /savedPosts/{postId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```

Essas regras são uma base de desenvolvimento e precisam ser revisadas antes de produção.

## Como rodar

1. Abra a pasta no VS Code.
2. Abra `app.html` com Live Server.
3. Teste Entrar, Criar conta e Sair.
4. Depois de logado, teste criar post, curtir, comentar e salvar.

## Limitações atuais

- Sem backend próprio
- Sem Storage nesta fase
- Sem upload real de imagem/vídeo
- Sem login social
- Sem seguidores, chat, notificações e moderação real
- Reels, stories, adoção e serviços ainda são simulações de interface

## Crédito

© 2026 Coded By CK. Todos os direitos reservados.
# humaPet
