/// <reference types="npm:@types/web-bluetooth"/>
import type { WritableAtom } from "nanostores";
import { atom } from "nanostores";
import { API_BASE } from "../utils/app_const.ts";

export enum RemoteStatus {
    CONNECTING,
    CONNECTED,
    CLOSED,
}
export enum DeviceStatus {
    DISCONNECTED,
    CONNECTING,
    DISCONNECTING,
    CONNECTED,
}

class EventChannel {
    deviceId = atom("");
    status = atom(RemoteStatus.CLOSED);
    source: WritableAtom<EventSource | undefined> = atom(undefined);
    constructor(id: string) {
        this.deviceId.set(id);
        this.deviceId.listen(() => {
            // reconnect when deviceId change
            if (this.status.get() !== RemoteStatus.CLOSED) {
                this.connect();
            }
        });
    }

    close() {
        const last = this.source.get();
        if (last) {
            last.close();
            this.status.set(RemoteStatus.CLOSED);
            this.source.set(undefined);
        }
    }

    connect() {
        this.close();
        this.status.set(RemoteStatus.CONNECTING);
        const url = `${API_BASE}/api/event/subscribe/${this.deviceId.get()}`;
        const source = new EventSource(url, { withCredentials: true });
        source.addEventListener("open", () => {
            this.status.set(RemoteStatus.CONNECTED);
        });
        source.addEventListener("error", () => {
            this.status.set(RemoteStatus.CLOSED);
        });
        this.source.set(source);
    }
}

export abstract class Device {
    #eventChannel: EventChannel;
    #eventSourceListenerController: AbortController;
    #commandQueue: string[] = [];
    #isProcessing: boolean = false;
    deviceId: WritableAtom<string>;
    remoteStatus: WritableAtom<RemoteStatus>;
    deviceStatus: WritableAtom<DeviceStatus> = atom(DeviceStatus.DISCONNECTED);
    statusText: WritableAtom<string> = atom("");
    configString: WritableAtom<string> = atom("");
    constructor(deviceId: string, _configString: string = "") {
        this.#eventSourceListenerController = new AbortController();
        this.#eventChannel = new EventChannel(deviceId);
        this.#eventChannel.source.listen((source) => {
            if (source) {
                // subscribe to message event when source changed
                this.#eventSourceListenerController.abort();
                this.#eventSourceListenerController = new AbortController();
                source.addEventListener("message", (event) => {
                    // when message received, add to queue
                    this.#commandQueue.push(event.data);
                    this.#processCommandQueue(); // process queue async
                }, { signal: this.#eventSourceListenerController.signal });
            }
        });
        this.deviceId = this.#eventChannel.deviceId;
        this.remoteStatus = this.#eventChannel.status;
    }

    #processCommandQueue = async () => {
        if (this.#isProcessing) {
            return;
        }
        this.#isProcessing = true;
        while (this.#commandQueue.length > 0) {
            const command = this.#commandQueue.shift()!;
            try {
                await this.onRemoteCommand(command);
            } catch (error) {
                console.error("Error processing command:", error);
            }
        }
        this.#isProcessing = false;
    };

    connectEventChannel() {
        this.#eventChannel.connect();
    }

    closeEventChannel() {
        this.#eventChannel.close();
    }

    abstract onRemoteCommand(command: string): void | Promise<void>;
    abstract connectDevice(): boolean | Promise<boolean>;
    abstract closeDevice(): void | Promise<void>;
}

export abstract class BLEDevice extends Device {
    bleListenerAbortController: AbortController = new AbortController();
    bleDevice: BluetoothDevice | undefined = undefined;
    bleGattServer: BluetoothRemoteGATTServer | undefined = undefined;
    constructor(deviceId: string, _configString: string = "") {
        super(deviceId, _configString);
    }

    async selectDevice() {
        if (!(navigator?.bluetooth?.requestDevice)) {
            return false;
        }
        this.closeDevice();
        try {
            const device = await navigator.bluetooth.requestDevice(this.defineBLEDeviceFilter());
            this.bleDevice = device;
            return true;
        } catch {
            return false;
        }
    }

    closeGattServer() {
        this.deviceStatus.set(DeviceStatus.DISCONNECTING);
        try {
            this.onGattServerDisconnected();
            this.bleGattServer?.disconnect();
        } catch (error) {
            console.error("Error disconnecting GATT server:", error);
        }
        this.bleGattServer = undefined;
        this.bleListenerAbortController.abort();
        this.bleListenerAbortController = new AbortController();
        this.deviceStatus.set(DeviceStatus.DISCONNECTED);
    }

    override closeDevice() {
        // this.bleDevice?.forget?.();
        // this.bleDevice = undefined;
        this.closeGattServer();
    }

    override async connectDevice() {
        // not support reuse device
        // if (!this.bleDevice?.gatt) {
        //     await this.selectDevice();
        //     if (!this.bleDevice?.gatt) {
        //         return false;
        //     }
        // }
        await this.selectDevice();
        if (!this.bleDevice?.gatt) {
            return false;
        }
        this.deviceStatus.set(DeviceStatus.CONNECTING);
        try {
            this.bleGattServer = await this.bleDevice.gatt.connect();
            await this.onGattServerConnected();
            // config listener
            this.bleDevice.addEventListener("gattserverdisconnected", () => {
                this.closeGattServer();
            }, { signal: this.bleListenerAbortController.signal });
            // connected
            this.deviceStatus.set(DeviceStatus.CONNECTED);
            return true;
        } catch (error) {
            console.error("Error connecting GATT server:", error);
        }
        this.deviceStatus.set(DeviceStatus.DISCONNECTED);
        return false;
    }

    abstract defineBLEDeviceFilter(): RequestDeviceOptions;
    abstract onGattServerConnected(): void | Promise<void>;
    abstract onGattServerDisconnected(): void;
}
