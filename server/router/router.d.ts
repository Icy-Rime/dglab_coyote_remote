export type RouterHandler = (
    req: Request,
    pathArgs: Record<string, string>,
) => Promise<Response | undefined>;
