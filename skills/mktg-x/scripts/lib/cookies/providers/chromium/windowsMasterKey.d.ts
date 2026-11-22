export declare function getWindowsChromiumMasterKey(userDataDir: string, label: string): Promise<{
    ok: true;
    value: Buffer;
} | {
    ok: false;
    error: string;
}>;
