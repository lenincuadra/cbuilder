import { describe, expect, it } from "vitest";
import { folderName, slugifyCompany } from "./folderName";

describe("slugifyCompany", () => {
  it("lowercases and removes spaces/punctuation", () => {
    expect(slugifyCompany("GlobalLogic")).toBe("globallogic");
    expect(slugifyCompany("Mercado Libre")).toBe("mercadolibre");
    expect(slugifyCompany("AT&T, Inc.")).toBe("attinc");
  });

  it("strips diacritics", () => {
    expect(slugifyCompany("Telefónica")).toBe("telefonica");
    expect(slugifyCompany("Núñez S.A.")).toBe("nunezsa");
  });
});

describe("folderName", () => {
  it("builds [LANG]_[company]_[code]", () => {
    expect(folderName({ language: "EN", company: "GlobalLogic", code: "0628r4" })).toBe(
      "EN_globallogic_0628r4",
    );
    expect(folderName({ language: "ES", company: "Mercado Libre", code: "0628r4" })).toBe(
      "ES_mercadolibre_0628r4",
    );
  });
});
