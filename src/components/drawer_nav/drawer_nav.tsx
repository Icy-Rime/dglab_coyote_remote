import type { FunctionComponent, JSX } from "preact";
import { $drawerNavOpen, setDrawerNavOpen } from "../../store/browser_var.ts";
import { useStore } from "@nanostores/preact";
import { Icon } from "../icon/icon.tsx";
import { useTranslator } from "../../hooks/i18n.ts";
import { Drawer } from "../drawer/drawer.tsx";
import { $isLogined, $username } from "../../store/user_info.ts";

export type DrawerNavProps = JSX.HTMLAttributes;

export const DrawerNav: FunctionComponent<DrawerNavProps> = (_: DrawerNavProps) => {
    const drawerNavOpen = useStore($drawerNavOpen);
    const username = useStore($username);
    const isLogined = useStore($isLogined);
    const t = useTranslator();
    return (
        <Drawer
            class="mysite_drawer_nav_container container"
            isOpen={drawerNavOpen}
            onClose={() => setDrawerNavOpen(false)}
        >
            <div class="mysite_drawer_nav_user_info">
                <div class="mysite_drawer_nav_user_info_item">
                    <Icon name="settings" />
                </div>
                <div class="mysite_drawer_nav_user_info_item_title">
                    <h4>{t({ zh: "网站", en: "Site" })}</h4>
                </div>
                <div class="mysite_drawer_nav_user_info_item_username">
                    {isLogined ? username : t({ zh: "登录", en: "Log in" })}
                </div>
                <div class="mysite_drawer_nav_user_info_item">
                    {isLogined ? <Icon name="log-out" /> : <Icon name="log-in" />}
                </div>
            </div>
        </Drawer>
    );
};
export default DrawerNav;
