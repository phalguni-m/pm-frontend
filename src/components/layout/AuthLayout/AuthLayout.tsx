import { Outlet } from "react-router-dom";
import styles from "@/components/layout/AuthLayout/AuthLayout.module.css";

/**
 * The only layout branch in the app that isn't AppShell — no sidebar, no
 * topbar, no breadcrumbs. Renders whatever auth page is active (LoginPage,
 * SignupPage) centered on the plain app canvas. No props: unlike AppShell
 * there's no sidebar/workspace/user data to thread through.
 */
export function AuthLayout() {
  return (
    <div className={styles.root}>
      <Outlet />
    </div>
  );
}
