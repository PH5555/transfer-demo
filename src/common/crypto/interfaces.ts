
export interface AffinePoint {
    x: bigint;
    y: bigint;
    clone(): AffinePoint;
    toJsonObj(): { x: string, y: string };
    toJsonStr(): string;
    toJson(): string;
    toString(): string;
    toHexArray(): string[];
    toArray(): bigint[];
}