import {DescribableDeprecatable} from "./core-api-declarations";

const DEFAULT_TAB = "    ";
const FIRST_COMMENT_LINE = "/**";

export class CodeBlock {
    private readonly code: (string | CodeBlock)[] = [];

    constructor(
        private readonly indentCharacters = DEFAULT_TAB,
        private readonly contentPrefix: string = "",
        private readonly firstLine?: string,
        private readonly lastLine?: string,
        private readonly wrapWithNewLines?: boolean,
        private readonly removeEmpty?: boolean,
    ) {
        if (firstLine) this.code.push(firstLine);
    }

    add(...codeLines: (string | false)[]) {
        this.code.push(...codeLines.filter(item => !!item).map(l => `${l}`));
        return this;
    }

    comment(addComments: (commentsBlock: CodeBlock) => void) {
        if (this.code[0] instanceof CodeBlock && this.code[0].firstLine === FIRST_COMMENT_LINE) {
            addComments(this.code[0]);
            return this;
        }

        const commentBlock = new CodeBlock(" * ", FIRST_COMMENT_LINE, " */");
        this.code.unshift(commentBlock);
        addComments(commentBlock);
        return this;
    }

    section(name?: string, wrapWithNewLines = false) {
        const section = new CodeBlock(
            this.indentCharacters,
            "",
            typeof name === "string" ? `// ${name}` : undefined,
            undefined,
            wrapWithNewLines,
            true
        );
        this.code.push(section);
        return section;
    }

    addAsSection(...lines: string[]) {
        return this.section().add(...lines);
    }

    scope(scopeDeclarationFirstLine: string, lastScopeLine: string | false = "}") {
        const scopeBlock = new CodeBlock(
            this.indentCharacters,
            scopeDeclarationFirstLine,
            lastScopeLine || undefined,
            undefined,
            true
        );
        this.code.push(scopeBlock);

        return scopeBlock;
    }

    addDescriptionAndDeprecationFor({Description, DeprecationMessage, IsDeprecated}: DescribableDeprecatable) {
        if (!Description && !IsDeprecated) return this;

        this.comment(c => c
            .add(Description ?? false)
            .add(IsDeprecated ? `@deprecated ${DeprecationMessage ?? ""}` : false));

        return this;
    }

    addDefinitionLine(declarationLine: string, definition: DescribableDeprecatable) {
        this.section()
            .add(declarationLine)
            .addDescriptionAndDeprecationFor(definition);

        return this;
    }

    addDefinitionLines<T extends DescribableDeprecatable>(definitions: T[], toDeclarationLine: (def: T) => string) {
        definitions.forEach(definition => this.addDefinitionLine(toDeclarationLine(definition), definition));
        return this;
    }

    getCodeLines(): string[] {
        if (this.removeEmpty && this.code.length === 1 && this.code[0] === this.firstLine) {
            return [];
        }

        return [
            ...this.wrapWithNewLines ? [""] : [],
            ...this.code.flatMap(code => {
                if (code === this.firstLine) {
                    return [code];
                }

                if (code instanceof CodeBlock) {
                    return code.getCodeLines().map(line => this.contentPrefix + line);
                }

                return code.split("\n")
                    .map(line => line.replace(/^\r|\r$/g, ""))
                    .map(line => this.contentPrefix + line);
            }),
            ...this.lastLine ? [this.lastLine] : [],
            ...this.wrapWithNewLines ? [""] : [],
        ];
    }

    toString() {
        return this.getCodeLines().join("\n");
    }
}