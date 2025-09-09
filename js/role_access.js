document.addEventListener("DOMContentLoaded", () => {
    const USER_ROLE = sessionStorage.getItem("user_role");
    const allowedPagesByRole = {
        Admin: [
            "active_attrition.html",
            "bps_absenteeism.html",
            "bps_attendance_db.html",
            "bps_bfp.html",
            "bps_dashboard.html",
            "lhi_absenteeism.html",
            "project_efficiency.html",
            "team_member.html",
            "quality_scores.html",
            "lhi_scorecard.html",
            "lhi_weekly_efficiency.html",
            "fedex_manifest_conso_data.html",
            "lhi_inventory.html",
            "daily_attendance_status.html",
            "bps_overall_dashboard.php",
            "fedex_aus_hourly_count.html"


        ],
        Manager: [
            "active_attrition.html",
            "bps_absenteeism.html",
            "bps_attendance_db.html",
            "bps_bfp.html",
            "bps_dashboard.html",
            "lhi_absenteeism.html",
            "project_efficiency.html",
            "team_member.html",
            "lhi_financial.html",
            "bps_financial.html",
            "lhi_bfp.html",
            "lhi_dashboard.html",
            "bu_bps.html",
            "bu_lhi.html",
            "quality_scores.html",
            "lhi_scorecard.html",
            "lhi_weekly_efficiency.html",
            "fedex_manifest_conso_data.html",
            "lhi_inventory.html",
            "daily_attendance_status.html",
            "bps_overall_dashboard.php",
            "fedex_aus_hourly_count.html"

        ],
        User: [
            "active_attrition.html",
            "team_member.html",

        ],
        lhi_admin: [
            "active_attrition.html",
            "team_member.html",
            "lhi_absenteeism.html",
            "lhi_scorecard.html",
            "lhi_dashboard.html",
            "lhi_weekly_efficiency.html",
            "lhi_bfp.html",
            "lhi_inventory.html"
        ],
        lhi_manager: [
            "active_attrition.html",
            "team_member.html",
            "lhi_absenteeism.html",
            "lhi_scorecard.html",
            "lhi_dashboard.html",
            "lhi_weekly_efficiency.html",
            "lhi_bfp.html",
            "lhi_financial.html",
            "bu_lhi.html",
            "lhi_inventory.html"
        ], 
        lhi_user: [
            "active_attrition.html",
            "team_member.html",
            "lhi_absenteeism.html",
            "lhi_scorecard.html",
            "lhi_dashboard.html",
            "lhi_weekly_efficiency.html",
            "lhi_inventory.html"
            
        ],
        bps_admin: [
            "active_attrition.html",
            "bps_absenteeism.html",
            "bps_attendance_db.html",
            "bps_bfp.html",
            "bps_dashboard.html",
            "project_efficiency.html",
            "team_member.html",
            "quality_scores.html",
            "fedex_manifest_conso_data.html",
            "daily_attendance_status.html",
            "bps_overall_dashboard.php",
            "fedex_aus_hourly_count.html"

        ],
        bps_manager: [
            "active_attrition.html",
            "bps_absenteeism.html",
            "bps_attendance_db.html",
            "bps_bfp.html",
            "bps_dashboard.html",
            "project_efficiency.html",
            "team_member.html",
            "bps_financial.html",
            "bu_bps.html",
            "quality_scores.html",
            "fedex_manifest_conso_data.html",
            "daily_attendance_status.html",
            "bps_overall_dashboard.php",
            "fedex_aus_hourly_count.html"

        ],
        bps_user: [
            "active_attrition.html",
            "bps_absenteeism.html",
            "bps_attendance_db.html",
            "bps_dashboard.html",
            "project_efficiency.html",
            "team_member.html",
            "quality_scores.html",
            "fedex_manifest_conso_data.html",
            "daily_attendance_status.html",
            "bps_overall_dashboard.php",
            "fedex_aus_hourly_count.html"
        ]           
        
    };

    const userAllowedPages = allowedPagesByRole[USER_ROLE] || [];

    // Find all sidebar <a> links and match against href targets
    document.querySelectorAll('.sidebar a[data-view]').forEach(link => {
        const view = link.dataset.view;
        const page = view.includes('.') ? view : `${view}.html`; // ✅ handles .php or .html
        if (!userAllowedPages.includes(page)) {
            link.style.display = 'none';
        }
    });

    // Handle child dropdown items (if inside div.child-dropdown)
    document.querySelectorAll('.child-dropdown a[data-view]').forEach(link => {
        const view = link.dataset.view;
        const page = view.includes('.') ? view : `${view}.html`; // ✅ same logic
        if (!userAllowedPages.includes(page)) {
            link.style.display = 'none';
        }
    });

    // Optional: hide entire parent dropdown if all children are hidden
    document.querySelectorAll('.dropdown').forEach(dropdown => {
        const children = dropdown.querySelectorAll('.child-dropdown a');
        const visibleChildren = Array.from(children).filter(c => c.style.display !== 'none');
        if (visibleChildren.length === 0) {
            dropdown.style.display = 'none';
        }
    });
});
