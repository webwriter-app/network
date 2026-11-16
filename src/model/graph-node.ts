export abstract class GraphNode {
    id!: string;
    name!: string;
    color: string;
    cssClass: string[] = [];
    /** Centre of the node in scene coordinates. */
    x = 0;
    y = 0;
    /** Id of the net this node sits in. */
    parent?: string;

    constructor(color: string) {
        this.color = color;
    }

    has(cssClass: string): boolean {
        return this.cssClass.includes(cssClass);
    }

    setClass(cssClass: string, on: boolean): void {
        const index = this.cssClass.indexOf(cssClass);
        if (on && index < 0) this.cssClass.push(cssClass);
        if (!on) while (this.cssClass.includes(cssClass)) this.cssClass.splice(this.cssClass.indexOf(cssClass), 1);
    }
}
