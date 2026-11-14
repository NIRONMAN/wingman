export class NativeClipboardService {
  private static mockClipboardMemory: string = 'Wingman MCP Node Active';

  private static getClipboardModule(): any {
    try {
      const Clipboard = require('@react-native-clipboard/clipboard').default;
      return Clipboard;
    } catch {
      return null;
    }
  }

  static async getString(): Promise<string> {
    const Clipboard = this.getClipboardModule();
    if (Clipboard?.getString) {
      try {
        return await Clipboard.getString();
      } catch {
        return this.mockClipboardMemory;
      }
    }
    return this.mockClipboardMemory;
  }

  static async setString(content: string): Promise<boolean> {
    this.mockClipboardMemory = content;
    const Clipboard = this.getClipboardModule();
    if (Clipboard?.setString) {
      try {
        Clipboard.setString(content);
        return true;
      } catch {
        return true;
      }
    }
    return true;
  }
}
