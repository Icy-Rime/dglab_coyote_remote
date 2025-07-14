import type { FunctionComponent, JSX } from "preact";
import { useMergedClassName } from "../utils.ts";

export type FooterRecordProps = JSX.HTMLAttributes<HTMLDivElement>;

export const FooterRecord: FunctionComponent<FooterRecordProps> = (props: FooterRecordProps) => {
    const className = useMergedClassName("mysite_footer_record_container", props.class);
    return (
        <div {...props} class={className}>
            <div class="mysite_footer_record_row">
                <i>footer</i>
            </div>
            <div class="mysite_footer_record_row">
                <i>
                    <a href="https://beian.miit.gov.cn">某ICP备20xx123456号-y</a>
                </i>
            </div>
        </div>
    );
};
export default FooterRecord;
