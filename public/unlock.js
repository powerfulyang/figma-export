// 运行时注入逻辑
async function unlockFigma() {
  const PREFIX = "[Figma Export: Unlock Figma]";
  const STYLE = "color: #1890ff; font-weight: bold;";

  const logger = ["log", "warn", "error"].reduce((acc, method) => {
    acc[method] = (...args) => {
      const [first, ...rest] = args;
      const isStr = typeof first === "string";
      const params = isStr
        ? [`%c${PREFIX}%c ${first}`, STYLE, "", ...rest]
        : [`%c${PREFIX}`, STYLE, ...args];
      console[method](...params);
    };
    return acc;
  }, {});

  const current = document.currentScript;
  if (!current || !current.src) return;

  try {
    const response = await fetch(current.src);
    const original = await response.text();

    const pattern = /let\{canRunExtensions:(\w+),canAccessFullDevMode:(\w+)}=(\w+).openFile;/;
    const replacer = "let{canRunExtensions:$1,canAccessFullDevMode:$2}=$3.openFile;$1=true;";
    const rewritten = original.replace(pattern, replacer);

    if (rewritten !== original) {
      Object.defineProperty(document, "currentScript", {
        configurable: true,
        get() {
          return current;
        }
      });
      try {
        new Function(rewritten)();
      } catch (e) {
        logger.error("脚本执行失败:", e);
        // 回退到原始脚本
        const script = document.createElement("script");
        script.src = `${current.src}?fallback=true`;
        document.head.appendChild(script);
      }
      logger.log("成功注入权限补丁: canRunExtensions -> true, src: ", current?.src);
    }
  } catch (error) {
    logger.error("脚本重写失败:", error);
  }
}

void unlockFigma();
