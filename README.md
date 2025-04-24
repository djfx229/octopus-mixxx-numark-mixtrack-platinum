
# Настройка LSP

Для корректной работы подсветки синтакциса, необходимо создать `jsconfig.json`.
Подробнее https://mixxx.org/news/2024-08-18-controller-api-declartions/
В сам проект данный json не включаю, так как мой путь установки Mixxx отличается от стандартного.

```
{
"compilerOptions": {
    "target": "es6",
    "checkJs": true,
    "lib": [ "ES2016" ]
},
"include": [
    "./Octopus-Numark-Mixtrack-Platinum-scripts.js",
    "./octopus.js",
    "C:/Program Files/Mixxx/controllers/common-controller-scripts.js",
    "C:/Program Files/Mixxx/controllers/engine-api.d.ts",
    "C:/Program Files/Mixxx/controllers/color-mapper-api.d.ts",
    "C:/Program Files/Mixxx/controllers/console-api.d.ts",
    "C:/Program Files/Mixxx/controllers/midi-controller-api.d.ts"
]
}
```