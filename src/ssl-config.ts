import * as fs from "fs";
import { join } from "path";

export const caCert =
  process.env.NODE_ENV === "production"
    ? fs.readFileSync(join(process.cwd(), "ca.pem"))
    : undefined;
