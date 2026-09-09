import Image from "next/image";

import darkLogo from "@/public/brand/lucrivo-logo-dark.svg";
import lightLogo from "@/public/brand/lucrivo-logo.svg";

export function Logo() {
  return (
    <>
      <Image
        src={lightLogo}
        alt="Lucrivo"
        sizes="36px"
        className="size-full object-contain dark:hidden"
      />
      <Image
        src={darkLogo}
        alt="Lucrivo"
        sizes="36px"
        className="hidden size-full object-contain dark:block"
      />
    </>
  );
}
