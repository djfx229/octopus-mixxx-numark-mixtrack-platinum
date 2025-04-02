/**
 * Octopus - набор классов упрощающих реализацию различных слоёв для пэдов в рамках маппинга Mixxx.
 */

(function (global) {

  /**
   * Превращает десятичное число в шестнадцатеричное в виде отформатированной строки
   */
  const formatToHex = function (dec) {
    return "0x" + ("0" + (Number(dec).toString(16))).slice(-2).toUpperCase()
  }

  class LedValue {
    static get ON() {
      return 0x40;
    }

    static get HALF() {
      return 0x03;
    }

    static get OFF() {
      return 0x00;
    }
  }

  class Output {
    constructor() { }

    led(numberPad, value) {
      console.log("Output: led numberPad=" + numberPad + " , value=" + value + " ");
    }

    clear() {
      console.log("Output: clear()");
    }
  }

  class EmptyOutput extends Output {
    constructor() {
      super();
    }

    led(numberPad, value) {
      console.log("EmptyOutput: led numberPad=" + numberPad + " , value=" + value + " ");
    }
  }

  /**
   * Для создания объекта связывающего пад с его реальным midi сообщением.
   * 
   * @param options Object содержащий в себе:
   * midinoArray
   * channel - hex код канала
   */
  class MidiAddress {
    constructor(options) {
      this.midinoArray = options.midinoArray;
      this.channel = options.channel;
    }
  }

  /**
   * @param options Object содержащий в себе:
   * group: String группа, обозначенная в рамках маппинга (например, [Channel1])
   * requestPadAddress: function(group, pad) => MidiAddress
   */
  class DeviceOutput extends Output {
    constructor(options) {
      super();

      if (options.group === undefined) {
        console.warn("ERROR: для инициализации DeviceOutput необходим group");
        return;
      }

      if (options.requestPadAddress === undefined) {
        console.warn("ERROR: для инициализации DeviceOutput необходим requestPadAddress");
        return;
      }

      this.group = options.group;
      this.requestPadAddress = options.requestPadAddress;
    }

    led(numberPad, value) {
      // console.log("DeviceOutput: led numberPad=" + numberPad + " , value=" + value + " ");
      const address = this.requestPadAddress(this.group, numberPad);
      // console.log("DeviceOutput: led address.midinoArray=" + address.midinoArray + " , address.channel=" + address.channel + " ");

      if (address instanceof MidiAddress) {
        address.midinoArray.forEach((midino) => {
          const status = 0x90 | address.channel;
          // console.log("DeviceOutput: led midinoArray.forEach status=" + formatToHex(status) + " , midino=" + formatToHex(midino) + " ");

          midi.sendShortMsg(status, midino, value);
        })
      }
    }

    clear() {
      console.log("DeviceOutput: clear()");
      for (let number = 1; number <= 8; number++) {
        this.led(number, LedValue.OFF);
      }
    }
  }

  /**
   * Номерация падов выглядит следующим образом:
   * [1][2][3][4]
   * [5][6][7][8]
   */
  class Layer {
    constructor(group) {
      this.group = group;
      this.output = new EmptyOutput();
      this.pressedShift = false;
    }

    connect(output) {
      this.output = output;
      this.updateLedState();
    }

    disconnect() {
      this.output = new EmptyOutput();
    }

    updateLedState() { }

    pad(numberPad, isPressed) {
      console.log("Layer: pressed pad " + numberPad);
    }

    shift(isPressed) {
      this.pressedShift = isPressed;
    }
  }

  class BeatJumpLayer extends Layer {
    constructor(group) {
      super(group);

      this.mapPadToAction = new Map();
      this.mapPadToAction[1] = {
        jump: 1,
        direction: "_backward",
      };
      this.mapPadToAction[2] = {
        jump: 1,
        direction: "_forward",
      };
      this.mapPadToAction[3] = {
        jump: 4,
        direction: "_backward",
      };
      this.mapPadToAction[4] = {
        jump: 4,
        direction: "_forward",
      };
      this.mapPadToAction[5] = {
        jump: 16,
        direction: "_backward",
      };
      this.mapPadToAction[6] = {
        jump: 16,
        direction: "_forward",
      };
      this.mapPadToAction[7] = {
        jump: 32,
        direction: "_backward",
      };
      this.mapPadToAction[8] = {
        jump: 32,
        direction: "_forward",
      };
    }

    updateLedState() {
      for (let number = 1; number <= 8; number++) {
        this.output.led(number, number % 2 == 1 ? LedValue.HALF : LedValue.ON);
      }
    }

    pad(numberPad, isPressed) {
      console.log("BeatJumpLayer: group=" + this.group + ", pressed pad " + numberPad);

      if (isPressed) {
        const action = this.mapPadToAction[numberPad];
        const key = "beatjump_" + action.jump + action.direction;
        engine.setValue(this.group, key, 1.0);
      }
    }
  }

  class AutoLoopLayer extends Layer {
    constructor(group) {
      super(group);

      const mapPadToKey = new Map();
      mapPadToKey[1] = 1;
      mapPadToKey[2] = 2;
      mapPadToKey[3] = 4;
      mapPadToKey[4] = 8;
      mapPadToKey[5] = 16;
      mapPadToKey[6] = 32;
      this.mapPadToKey = mapPadToKey;

      const mapShiftedPadToKey = new Map();
      mapShiftedPadToKey[1] = 1 / 1;
      mapShiftedPadToKey[2] = 1 / 2;
      mapShiftedPadToKey[3] = 1 / 4;
      mapShiftedPadToKey[4] = 1 / 8;
      mapShiftedPadToKey[5] = 1 / 16;
      mapShiftedPadToKey[6] = 1 / 32;
      this.mapShiftedPadToKey = mapShiftedPadToKey;
    }

    updateLedState() {
      for (let number = 1; number <= 8; number++) {
        this.output.led(number, number < 7 ? LedValue.ON : LedValue.HALF);
      }
    }

    /**
     * https://manual.mixxx.org/2.5/ru/chapters/appendix/mixxx_controls#control-%5BChannelN%5D-beatloop_X_toggle
     * https://manual.mixxx.org/2.5/ru/chapters/appendix/mixxx_controls#control-%5BChannelN%5D-loop_halve
     * https://manual.mixxx.org/2.5/ru/chapters/appendix/mixxx_controls#control-%5BChannelN%5D-loop_double
     * https://manual.mixxx.org/2.5/ru/chapters/appendix/mixxx_controls#control-%5BChannelN%5D-reloop_toggle
     */
    pad(numberPad, isPressed) {
      if (isPressed) {
        if (numberPad < 7) {
          console.log("AutoLoopLayer: pad() numberPad=" + numberPad);
          const value = this.pressedShift ? this.mapShiftedPadToKey[numberPad] : this.mapPadToKey[numberPad];
          const isEnabled = engine.getValue(this.group, "beatloop_" + value + "_enabled");

          const key = "beatloop_" + value + (isEnabled ? "_toggle" : "_activate");
          engine.setValue(this.group, key, 1.0);
        } else if (numberPad == 7) {
          engine.setValue(this.group, this.pressedShift ? "reloop_toggle" : "loop_halve", 1.0);
        } else if (numberPad == 8) {
          engine.setValue(this.group, this.pressedShift ? "reloop_toggle" : "loop_double", 1.0);
        }
      }
    }
  }

  class LoopRollLayer extends Layer {
    constructor(group) {
      super(group);

      const mapPadToKey = new Map();
      mapPadToKey[1] = 1 / 1;
      mapPadToKey[2] = 1 / 2;
      mapPadToKey[3] = 1 / 4;
      mapPadToKey[4] = 1 / 8;
      mapPadToKey[5] = 1 / 16;
      mapPadToKey[6] = 1 / 32;
      mapPadToKey[7] = 2;
      mapPadToKey[8] = 4;
      this.mapPadToKey = mapPadToKey;
    }

    /**
     * https://manual.mixxx.org/2.5/ru/chapters/appendix/mixxx_controls#control-%5BChannelN%5D-beatlooproll_activate
     */
    pad(numberPad, isPressed) {
      if (!this.pressedShift) {
        console.log("LoopRollLayer: pad() numberPad=" + numberPad);
        this.output.led(numberPad, isPressed ? LedValue.ON : LedValue.OFF);
        const value = this.mapPadToKey[numberPad];
        const key = "beatlooproll_" + value + "_activate";
        engine.setValue(this.group, key, isPressed);
      }
    }
  }

  class DeckSettingsLayer extends Layer {
    constructor(group) {
      super(group);
      this.currentMode = 0;
      this.pitchSliderRanges = [0.08, 0.16, 0.50, 1.0];
    }

    pad(numberPad, isPressed) {
      if (numberPad < 4) {
        if (isPressed) {
          this.currentMode = numberPad;
          console.log("DeckSettingsLayer: pad() change mode, currentMode=" + this.currentMode);
        } else {
          this.currentMode = 0;
          console.log("DeckSettingsLayer: pad() reset mode");
        }
      } else if (numberPad == 4 && isPressed) {
        // включить - выключить отображение bpm
      } else if (isPressed) {
        const value = numberPad - 4;
        console.log("DeckSettingsLayer: pad() use mode, value=" + value);
        switch (this.currentMode) {
          case 1:
            this.changePitchRange(value);
            break;
          case 2:
            this.changeCrossfadeOrientation(value);
            break;
          case 3:
            // sync, beats_translate_curpos
            break;
          default:
            this.changeKey(value);
            break;
        }
      }
    }

    /**
     * https://manual.mixxx.org/2.5/ru/chapters/appendix/mixxx_controls.html#control-%5BChannelN%5D-rateRange
     */
    changePitchRange(value) {
      engine.setValue(this.group, 'rateRange', this.pitchSliderRanges[value - 1]);
    }

    /**
     * https://manual.mixxx.org/2.5/ru/chapters/appendix/mixxx_controls.html#control-%5BChannelN%5D-orientation
     */
    changeCrossfadeOrientation(value) {
      if (value < 4) {
        engine.setValue(this.group, 'orientation', value - 1);
      }
    }

    /**
     * https://manual.mixxx.org/2.5/ru/chapters/appendix/mixxx_controls.html#control-%5BChannelN%5D-sync_key
     * https://manual.mixxx.org/2.5/ru/chapters/appendix/mixxx_controls.html#control-%5BChannelN%5D-reset_key
     * https://manual.mixxx.org/2.5/ru/chapters/appendix/mixxx_controls.html#control-%5BChannelN%5D-pitch_down
     * https://manual.mixxx.org/2.5/ru/chapters/appendix/mixxx_controls.html#control-%5BChannelN%5D-pitch_up
     */
    changeKey(numberPad) {
      switch (numberPad) {
        case 1:
          engine.setValue(this.group, "sync_key", 1);
        case 2:
          engine.setValue(this.group, "reset_key", 1);
          break;
        case 3:
          engine.setValue(this.group, "pitch_down", 1);
          break;
        case 4:
          engine.setValue(this.group, "pitch_up", 1);
          break;
      }
    }
  }

  class CueLoopLayer extends Layer {
    constructor(options) {
      super(options.group);

      this.offset = options.offset;
      this.count = 7;

      this.connections = new Map();

      for (let number = 1; number <= this.count; number++) {
        this.connections[number] = this.connection(number);
      }
    }

    connection(number) {
      const callback = function (value, group, control) {
        console.log("CueLoopsLayer: testing makeConnection number=" + number + ", value=" + value + ", control=" + control);
        this.output.led(number, value == 0 ? LedValue.OFF : LedValue.ON);
      };

      return engine.makeConnection(
        this.group,
        "hotcue_" + (number + this.offset) + "_status",
        callback.bind(this)
      );
    }

    updateLedState() {
      for (let number = 1; number <= this.count; number++) {
        this.connections[number].trigger();
      }
      this.output.led(this.count + 1, LedValue.HALF);
    }

    pad(numberPad, isPressed) {

      if (isPressed) {
        if (numberPad <= this.count) {
          // https://manual.mixxx.org/2.5/ru/chapters/appendix/mixxx_controls#control-%5BChannelN%5D-hotcue_X_status
          const isActive = () => {
            const result = engine.getValue(this.group, "hotcue_" + (numberPad + this.offset) + "_status");
            console.log("CueLoopsLayer: pressed pad status=" + result);
            return result > 0;
          }

          const keyPrefix = "hotcue_" + (numberPad + this.offset);
          if (this.pressedShift) {
            // https://manual.mixxx.org/2.5/ru/chapters/appendix/mixxx_controls#control-%5BChannelN%5D-hotcue_X_clear
            const key = keyPrefix + "_clear";
            console.log("CueLoopsLayer: pressed pad key=" + key);
            engine.setValue(this.group, key, 1.0);
          } else if (isActive()) {
            // https://manual.mixxx.org/2.5/ru/chapters/appendix/mixxx_controls#control-%5BChannelN%5D-hotcue_X_gotoandloop
            const key = keyPrefix + "_gotoandloop";
            console.log("CueLoopsLayer: pressed pad key=" + key);
            engine.setValue(this.group, key, 1.0);
          } else {
            // https://manual.mixxx.org/2.5/ru/chapters/appendix/mixxx_controls#control-%5BChannelN%5D-hotcue_X_setloop
            const key = keyPrefix + "_setloop";
            console.log("CueLoopsLayer: pressed pad key=" + key);
            engine.setValue(this.group, key, 1.0);
          }
        } else {
          engine.setValue(this.group, "reloop_toggle", 1.0);
        }
      }
    }
  }

  class SandboxLayer extends Layer {
    constructor(group) {
      super(group);
      this.deck = 1; // script.deckFromGroup(this.group);
      this.brakeFactor = 0.5;
    }

    pad(numberPad, isPressed) {
      console.log("SandboxLayer: pad() numberPad=" + numberPad);
      switch (numberPad) {
        case 1:
          if (isPressed) engine.setValue(this.group, "hotcue_1_activateloop", 1);
        case 2:
          if (isPressed) engine.setValue(this.group, "hotcue_1_cueloop", 1);
          break;
        case 3:
          if (isPressed) engine.setValue(this.group, "hotcue_2_activateloop", 1);
          break;
        case 4:
          if (isPressed) engine.setValue(this.group, "hotcue_2_cueloop", 1);
          break;
        case 5:
          engine.setValue(this.group, "beats_translate_curpos", isPressed);
          break;
        case 6:
          this.slip(isPressed);
          break;
        case 7:
          this.revers(numberPad, isPressed);
          break;
        case 8:
          this.brake(isPressed);
          break;
      }
    }

    /**
     * https://manual.mixxx.org/2.5/ru/chapters/appendix/mixxx_controls#control-%5BChannelN%5D-slip_enabled
     */
    slip(isPressed) {
      if (isPressed) {
        const isActive = engine.getValue(this.group, "slip_enabled");
        engine.setValue(this.group, "slip_enabled", isActive ? 0 : 1);
      }
    }

    /**
     * https://manual.mixxx.org/2.5/ru/chapters/appendix/mixxx_controls#control-%5BChannelN%5D-reverseroll
     * https://manual.mixxx.org/2.5/ru/chapters/appendix/mixxx_controls#control-%5BChannelN%5D-reverse
     */
    revers(numberPad, isPressed) {
      if (this.pressedShift) {
        this.output.led(numberPad, isPressed ? LedValue.ON : LedValue.OFF);
        engine.setValue(this.group, "reverseroll", isPressed);
      } else if (isPressed) {
        const isActive = engine.getValue(this.group, "reverse");
        const value = isActive ? 0 : 1;
        engine.setValue(this.group, "reverse", value);
        this.output.led(numberPad, value ? LedValue.ON : LedValue.OFF);
      }
    }

    /**
     * https://github.com/mixxxdj/mixxx/wiki/midi%20scripting#spinback-brake-and-soft-start-effect
     */
    brake(isPressed) {
      if (isPressed) {
        const isActive = engine.getValue(this.group, "play_latched");
        if (isActive) {
          engine.brake(this.deck, true, this.brakeFactor);
        } else {
          engine.softStart(this.deck, true, this.brakeFactor);
        }
      }
    }
  }

  class HotCuesLayer extends Layer {
    constructor(options) {
      super(options.group);

      this.offset = options.offset;
      this.connections = new Map();

      for (let number = 1; number <= 8; number++) {
        this.connections[number] = this.connection(number);
      }
    }

    connection(number) {
      const callback = function (value, group, control) {
        console.log("HotCuesLayer: testing makeConnection number=" + number + ", value=" + value + ", control=" + control);
        this.output.led(number, value == 0 ? LedValue.OFF : LedValue.ON);
      };

      return engine.makeConnection(
        this.group,
        "hotcue_" + (number + this.offset) + "_status",
        callback.bind(this)
      );
    }

    updateLedState() {
      for (let number = 1; number <= 8; number++) {
        this.connections[number].trigger();
      }
    }

    /**
     * https://manual.mixxx.org/2.5/ru/chapters/appendix/mixxx_controls#control-%5BChannelN%5D-hotcue_X_activatecue
     * https://manual.mixxx.org/2.5/ru/chapters/appendix/mixxx_controls#control-%5BChannelN%5D-hotcue_X_clear
     */
    pad(numberPad, isPressed) {
      const operation = this.pressedShift ? "_clear" : "_activatecue";
      const key = "hotcue_" + (numberPad + this.offset) + operation;
      console.log("HotCuesLayer: pressed pad " + numberPad + ", shift=" + this.pressedShift + ", key=" + key);
      engine.setValue(this.group, key, isPressed ? 1.0 : 0.0);
    }
  }

  class SwitchLayersLayer extends Layer {
    constructor(options) {
      super(options.deck);

      // row 1
      this.hotcuesLayerBankB = new HotCuesLayer({
        offset: 8,
        group: this.group,
      });
      this.looprollLayer = new LoopRollLayer(this.group);
      this.cueloopLayer = new CueLoopLayer({
        group: this.group,
        offset: 16, // Отступаем от обычных hotcues
      });
      this.sandboxLayer = new SandboxLayer(this.group);

      // row 2
      this.hotcuesLayerBankA = new HotCuesLayer({
        offset: 0,
        group: this.group,
      });
      this.autoloopLayer = new AutoLoopLayer(this.group);
      this.beatjumpsLayer = new BeatJumpLayer(this.group);
      this.deckSettingsLayer = new DeckSettingsLayer(this.group);

      this.currentLayerNum = 1;
    }

    updateLedState() {
      this.output.clear();
      this.output.led(this.currentLayerNum, LedValue.ON);
    }

    currentLayer() {
      console.log("SwitchLayersLayer: currentLayer() " + this.currentLayerNum);
      switch (this.currentLayerNum) {
        case 1:
          return this.hotcuesLayerBankB;
        case 2:
          return this.looprollLayer;
        case 3:
          return this.cueloopLayer;
        case 4:
          return this.sandboxLayer;
        case 5:
          return this.hotcuesLayerBankA;
        case 6:
          return this.autoloopLayer;
        case 7:
          return this.beatjumpsLayer;
        case 8:
          return this.deckSettingsLayer;
      }
    }

    pad(numberPad, isPressed) {
      console.log("SwitchLayersLayer: pressed pad " + numberPad);
      if (isPressed) {
        this.currentLayerNum = numberPad;
        this.updateLedState();
      }
    }
  }

  class Input {
    constructor(options) {
      this.group = options.group;
      this.output = new EmptyOutput();
      this.isSwitchLayerState = false;
      this.switchLayersLayer = new SwitchLayersLayer({
        deck: this.group,
      });
    }

    connect(output) {
      this.output = output;
      this.switchLayersLayer.currentLayer().connect(this.output);
    }

    disconnect() {
      this.output = new EmptyOutput();
      this.switchLayersLayer.currentLayer().disconnect()
    }

    switchLayerButton(value) {
      this.output.clear();
      this.isSwitchLayerState = value > 0;
      if (this.isSwitchLayerState) {
        this.switchLayersLayer.currentLayer().disconnect();
        this.switchLayersLayer.connect(this.output);
      } else {
        this.switchLayersLayer.disconnect();
        this.switchLayersLayer.currentLayer().connect(this.output);
      }
    };

    shift(isPressed) {
      this.pressedShift = isPressed;
      this.switchLayersLayer.currentLayer().shift(isPressed);
    };

    pad(numPad, value) {
      const isPressed = value > 0;
      if (this.isSwitchLayerState) {
        this.switchLayersLayer.pad(numPad, isPressed);
      } else {
        this.switchLayersLayer.currentLayer().pad(numPad, isPressed);
      }
    }
  }

  /**
   * @param options Object содержащий в себе:
   * groupsArray: List<String> - массив названий групп (например, [Channel1]), для которых 
   *  будут созданы Input.
   * midiToPad: function (group, control, channel, isShift) - сопоставляет, к какому паду 
   *  относится полученное midi сообщение
   * requestPadAddress: function(group, pad) => MidiAddress
   */
  class GroupedInputs {
    constructor(options) {
      if (options.requestPadAddress === undefined) {
        console.warn("ERROR: для инициализации DeviceOutput необходим requestPadAddress");
        return;
      }

      if (options.groupsArray === undefined) {
        console.warn("ERROR: для инициализации DeviceOutput необходим groupsArray");
        return;
      }

      if (options.midiToPad === undefined) {
        console.warn("ERROR: для инициализации DeviceOutput необходим midiToPad");
        return;
      }

      this.pressedShift = false;
      this.groupsArray = options.groupsArray;
      this.inputs = new Map();
      this.midiToPad = options.midiToPad;

      const buildInput = (group, output) => {
        const input = new Input({
          group: group,
        });
        input.connect(output);
        return input;
      };

      this.groupsArray.forEach((group) => {
        const output = new DeviceOutput({
          group: group,
          requestPadAddress: options.requestPadAddress,
          midiToPad: options.midiToPad,
        });
        this.inputs[group] = buildInput(group, output);
      })
    }

    shift(isPressed) {
      this.pressedShift = isPressed;
      this.groupsArray.forEach((group) => {
        const input = this.inputs[group];
        if (input instanceof Input) {
          input.shift(this.pressedShift);
        }
      })
    }

    input(channel, control, value, status, group) {
      const number = this.midiToPad(group, control, channel, this.pressedShift);
      this.inputs[group].pad(number, value);
    }

    switchLayerButton(channel, control, value, status, group) {
      console.log("GroupedInputs: switchLayerButton()");
      this.inputs[group].switchLayerButton(value);
    }

    init() {
      this.groupsArray.forEach((group) => {
        const input = this.inputs[group];
        if (input instanceof Input) {
          input.shift(this.pressedShift);
        }
      })
    }
  }

  // Экспортируем классы в глобальный объект
  const exports = {};
  exports.MidiAddress = MidiAddress;
  exports.Input = Input;
  exports.GroupedInputs = GroupedInputs;
  exports.DeviceOutput = DeviceOutput;
  exports.BeatJumpLayer = BeatJumpLayer;
  exports.HotCuesLayer = HotCuesLayer;

  global.octopus = exports;
}(this));
