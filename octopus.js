/**
 * Octopus - набор классов упрощающих реализацию различных слоёв для пэдов в рамках маппинга Mixxx.
 */

(function (global) {

  class LedValue {
    static get ON() {
      return 0x7F;
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
   * @param options Object содержащий в себе:
   * midiChannelCallback - функций принимающая номер пада, и возвращающая для него номер канала
   * mapPadToLedHex - карта сопоставляющая номер пада с его midino кодом.
   */
  class DeviceOutput extends Output {
    constructor(options) {
      super();
      this.getMidiChannel = options.getMidiChannel;
      this.mapPadToLedHex = options.mapPadToLedHex;
    }

    led(numberPad, value) {
      const midinoArray = this.mapPadToLedHex[numberPad];
      console.log("DeviceOutput: led() midinoArray=" + midinoArray + ", numberPad=" + numberPad + " , value=" + value + " ");

      midinoArray.forEach((midino) => {
        midi.sendShortMsg(0x90 | this.getMidiChannel(numberPad), midino, value);
      })
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

    updateLedState() {}

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
        this.output.led(number, number % 2 == 1 ? 0x03 : LedValue.ON);
      }
    }

    pad(numberPad, isPressed) {
      console.log("BeatJumpLayer: pressed pad " + numberPad);

      if (isPressed) {
        const action = this.mapPadToAction[numberPad];
        const key = "beatjump_" + action.jump + action.direction;
        engine.setValue(this.group, key, 1.0);
      }
    }
  }

  /**
   * Расположение hotcue отличается от номерации в Layer!
   * [5][6][7][8]
   * [1][2][3][4].
   */
  class HotCuesLayer extends Layer {
    constructor(group) {
      super(group);

      const mapPadToHotCue = new Map();
      mapPadToHotCue[1] = [5];
      mapPadToHotCue[2] = [6];
      mapPadToHotCue[3] = [7];
      mapPadToHotCue[4] = [8];
      mapPadToHotCue[5] = [1];
      mapPadToHotCue[6] = [2];
      mapPadToHotCue[7] = [3];
      mapPadToHotCue[8] = [4];
      this.mapPadToHotCue = mapPadToHotCue;

      this.connections = new Map();

      for (let number = 1; number <= 8; number++) {
        this.connections[number] = this.connection(number);
      }
    }

    connection(number) {
      const callback = function(value, group, control) {
        console.log("HotCuesLayer: testing makeConnection number=" + number + ", value=" + value + ", control=" + control);
        this.output.led(this.mapPadToHotCue[number], value == 0 ? LedValue.OFF : LedValue.ON);
      };

      return engine.makeConnection(
        this.group, 
        "hotcue_" + number + "_status",
        callback.bind(this)
      );
    }

    updateLedState() {
      for (let number = 1; number <= 8; number++) {
        this.connections[number].trigger();
      }
    }

    pad(numberPad, isPressed) {
      console.log("HotCuesLayer: pressed pad " + numberPad);

      const operation = this.pressedShift ? "_clear" : "_activate";
      const key = "hotcue_" + this.mapPadToHotCue[numberPad] + operation;
      engine.setValue(this.group, key, isPressed ? 1.0 : 0.0);
    }
  }

  class SwitchLayersLayer extends Layer {
    constructor(options) {
      super(options.deck);

      this.hotcuesLayer = new HotCuesLayer(this.group);
      this.beatjumpsLayer = new BeatJumpLayer(this.group);
      this.currentLayerNum = 1;
    }

    updateLedState() {
      this.output.clear();
      this.output.led(this.currentLayerNum, LedValue.ON);      
    }

    currentLayer() {
      //   console.log("SwitchLayersLayer: currentLayer() " + this.currentLayerNum);
      switch (this.currentLayerNum) {
        // case 1: - default
        case 2:
          //   console.log("SwitchLayersLayer: currentLayer() beatjumpsLayer " + this.beatjumpsLayer);
          return this.beatjumpsLayer;
        default:
          //   console.log("SwitchLayersLayer: currentLayer() hotcuesLayer " + this.hotcuesLayer);
          return this.hotcuesLayer;
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
        this.switchLayersLayer.updateLedState();
      } else {
        this.switchLayersLayer.disconnect();
        this.switchLayersLayer.currentLayer().connect(this.output);
        this.switchLayersLayer.currentLayer().updateLedState();
      }
    };

    shift() {
      this.pressedShift = true;
      this.switchLayersLayer.currentLayer().shift(this.pressedShift);
    }

    unshift() {
      this.pressedShift = false;
      this.switchLayersLayer.currentLayer().shift(this.pressedShift);
    }

    pad(numPad, value) {
      console.log("Input: pressed pad " + numPad);
      console.log("Input: current layer " + this.switchLayersLayer.currentLayer());

      const isPressed = value > 0;
      if (this.isSwitchLayerState) {
        this.switchLayersLayer.pad(numPad, isPressed);
      } else {
        this.switchLayersLayer.currentLayer().pad(numPad, isPressed);
      }
    }
  }

  // Экспортируем классы в глобальный объект
  const exports = {};
  exports.Input = Input;
  // private exports.Output = Output;
  exports.DeviceOutput = DeviceOutput;
  // private exports.Layer = Layer;
  // private exports.SwitchLayersLayer = SwitchLayersLayer;
  exports.BeatJumpLayer = BeatJumpLayer;
  exports.HotCuesLayer = HotCuesLayer;

  global.octopus = exports;
}(this));
