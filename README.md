
# Octopus Mixxx Numark Mixtrack Platinum

## Как работают пады теперь?

Пады для auto loop pad mode теперь могут управлять произвольными функциями, в зависимости от выбранного слоя.
Номерация падов выглядит следующим образом:
```
[1][2][3][4]
[5][6][7][8]
```

Выбор слоя происходит с помощью сочетания клавишь Wheel + пад.

| Pad number | Layer                |
| ---------- | -------------------- |
| 1          | HotCuesLayer, bank B |
| 2          | LoopRollLayer        |
| 3          | CueLoopLayer         |
| 4          |                      |
| 5          | HotCuesLayer, bank A |
| 6          | AutoLoopLayer        |
| 7          | BeatJumpLayer        |
| 8          | DeckSettingsLayer    |

Перечень функций, назначенных на тот или иной пад, в зависимости от выбранного слоя:

### HotCuesLayer, bank A

| Pad number | Default   | Shift            |
| ---------- | --------- | ---------------- |
| 1          | Hot Cue 1 | Delete Hot Cue 1 |
| 2          | Hot Cue 2 | Delete Hot Cue 2 |
| 3          | Hot Cue 3 | Delete Hot Cue 3 |
| 4          | Hot Cue 4 | Delete Hot Cue 4 |
| 5          | Hot Cue 5 | Delete Hot Cue 5 |
| 6          | Hot Cue 6 | Delete Hot Cue 6 |
| 7          | Hot Cue 7 | Delete Hot Cue 7 |
| 8          | Hot Cue 8 | Delete Hot Cue 8 |

### HotCuesLayer, bank B

| Pad number | Default    | Shift             |
| ---------- | ---------- | ----------------- |
| 1          | Hot Cue 9  | Delete Hot Cue 9  |
| 2          | Hot Cue 10 | Delete Hot Cue 10 |
| 3          | Hot Cue 11 | Delete Hot Cue 11 |
| 4          | Hot Cue 12 | Delete Hot Cue 12 |
| 5          | Hot Cue 13 | Delete Hot Cue 13 |
| 6          | Hot Cue 14 | Delete Hot Cue 14 |
| 7          | Hot Cue 15 | Delete Hot Cue 15 |
| 8          | Hot Cue 16 | Delete Hot Cue 16 |

### AutoLoopLayer

| Pad number | Default      | Shift          |
| ---------- | ------------ | -------------- |
| 1          | Auto Loop 1  | Auto Loop 1    |
| 2          | Auto Loop 2  | Auto Loop 1/2  |
| 3          | Auto Loop 4  | Auto Loop 1/4  |
| 4          | Auto Loop 8  | Auto Loop 1/8  |
| 5          | Auto Loop 16 | Auto Loop 1/16 |
| 6          | Auto Loop 32 | Auto Loop 1/32 |
| 7          | Loop halve   | Loop halve     |
| 8          | Loop double  | Loop double    |

### BeatJumpLayer

| Pad number | Default          |
| ---------- | ---------------- |
| 1          | Jump 1 backward  |
| 2          | Jump 1 forward   |
| 3          | Jump 4 backward  |
| 4          | Jump 4 forward   |
| 5          | Jump 16 backward |
| 6          | Jump 16 forward  |
| 7          | Jump 32 backward |
| 8          | Jump 32 forward  |

### DeckSettingsLayer

| Pad number row 2 | row 1, pad 1     | row 1, 2                     | row 1, 3  |
| ---------------- | ---------------- | ---------------------------- | --------- |
| 5                | Pitch Range 8%   | Left crossfade orientation   | Sync key  |
| 6                | Pitch Range 16%  | Center crossfade orientation | Reset key |
| 7                | Pitch Range 50%  | Right crossfade orientation  | Key down  |
| 8                | Pitch Range 100% |                              | Key up    |

### LoopRollLayer

| Pad number | Default        |
| ---------- | -------------- |
| 1          | Loop roll 1    |
| 2          | Loop roll 1/2  |
| 3          | Loop roll 1/4  |
| 4          | Loop roll 1/8  |
| 5          | Loop roll 1/16 |
| 6          | Loop roll 1/32 |
| 7          | Loop roll 2    |
| 8          | Loop roll 4    |

### CueLoopLayer

Так как в Mixxx hot cue и cue loop это одно и тоже, то у cue loop задано смещение на 16 чтобы оперировать ими как отдельными сущностями.

| Pad number | Default       | Shift             |
| ---------- | ------------- | ----------------- |
| 1          | Cue loop 1    | Delete cue loop 1 |
| 2          | Cue loop 2    | Delete cue loop 2 |
| 3          | Cue loop 3    | Delete cue loop 3 |
| 4          | Cue loop 4    | Delete cue loop 4 |
| 5          | Cue loop 5    | Delete cue loop 5 |
| 6          | Cue loop 6    | Delete cue loop 6 |
| 7          | Cue loop 7    | Delete cue loop 7 |
| 8          | Reloop toggle | Reloop toggle     |

## Настройка LSP

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