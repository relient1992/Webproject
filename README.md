# PH Site Viewer

A comprehensive admin dashboard application featuring embedded Looker Studio visualizations, role-based access control, interactive dashboards, training material management and builder, and enhanced security measures.

---

## 📋 Overview

PH Site Viewer is a Single Page Application (SPA) designed as an administrative dashboard for the company.  
It provides secure access to data visualizations through embedded Looker Studio reports with a sophisticated permission system that supports multiple organizational entities.  

The platform has been enhanced with interactive dashboards, employee drilldowns, training material builder, system logs, and security mechanisms.

---

## ✨ Features

- **🔐 Authentication System**: Complete login and registration functionality  
- **📊 Embedded Analytics**: Access to Looker Studio visualizations through secure iframes  

### 📈 BPS Overall Dashboard
- Chart and table viewer of employee performance  
- Custom and predefined date range selection  
- Flexible metric selection for visualization  
- Chart can compare two(primary and secondary)
- Intelligent filter mechanism
- Clickable operator name for production breakdown list

### 👥 Active & Attrition Page
- Interactive employee status tracking  
- Clickable values for *Active*, *Resigned*, and *Newly Hired* employees  
- Drilldown to view employee lists with search by EDS or Name  

### 📚 Training Material Builder *(Quality Team Feature)*
- Build and manage training materials in a web viewer for operations  
- Search, image zoom in/out, and WYSIWYG editor  
- User can create multiple modules and sub-modules  
- Save and upload JSON files to update training content  
- Generate HTML viewer for end-user access  

- **📝 System Logs**: Backend logging system to track user logins within the platform  

### 🛡️ Security & Risk Management
- Multi-role permission system restricting access based on role level  
- Session handling to prevent direct access to protected pages or view links  
- Prepared statements with parameterized queries to protect against SQL injection  

- **🌓 Theme Support**: Light and dark mode toggle for enhanced user experience  
- **📱 Single Page Application**: Seamless navigation between different report views  
- **👥 Employee Management**: Employee listing viewer and team member checker  
- **📤 Data Export**: Export functionality for team member and production data  
- **🔒 Role-Based Access Control**: 11-tier permission system with entity-specific roles  
- **🏢 Multi-Entity Support**: Separate role management for BPS and LHI entities  

---

## 🛠️ Technologies Used

- **Frontend**: HTML, CSS, JavaScript  
- **Backend**: PHP  
- **Database**: MySQL  
- **Admin Interface**: phpMyAdmin  
- **Server Environment**: XAMPP  

---

## 🎯 User Roles & Permissions

The application supports a comprehensive 11-level role system:

| Role ID | Role Name        | Description                   |
|---------|-----------------|-------------------------------|
| 1       | Super User      | Full system access            |
| 2       | Manager         | Management-level access       |
| 3       | Admin           | Administrative access         |
| 4       | User            | Standard user access          |
| 5       | LHI Admin       | LHI entity administrator      |
| 6       | LHI Manager     | LHI entity manager            |
| 7       | LHI User        | LHI entity standard user      |
| 8       | BPS Admin       | BPS entity administrator      |
| 9       | BPS Manager     | BPS entity manager            |
| 10      | BPS User        | BPS entity standard user      |
| 11      | BPS Quality User| BPS entity quality user       |

---

## 🚀 Access & Deployment

The application is deployed and accessible via server IP address.  
No local installation is required for end users.  

**Access Method**: Direct server IP access through web browser  

---

## 📋 Prerequisites

No special prerequisites are required.  
Users can access the application directly through their web browser using the provided server local IP address.  

---

## 🤝 Contributing

We welcome feedback and suggestions to improve the project!  
Please share your ideas and recommendations to help enhance the dashboard's functionality and user experience.  

---

## 📄 License

All Rights Reserved  

---

## 🏗️ Architecture

This application follows a traditional web architecture pattern:

- **Frontend**: Responsive SPA design with vanilla JavaScript  
- **Backend**: PHP-based server-side logic  
- **Database**: MySQL for user management, system logs, and application data  
- **Integration**: Embedded Looker Studio for data visualization  

### Security Layer
- Role-based access control  
- Session management for restricted page access  
- Prepared statements with parameterized queries  
- Audit trail via backend system logs  

---

## 🔧 Key Components

- **Authentication Module**: Secure login/registration system  
- **Dashboard Interface**: Multi-view SPA for different reports  
- **BPS Overall Dashboard**: Interactive performance charts, tables, and metric comparisons  
- **Active & Attrition Page**: Employee drilldown with search and filtering  
- **Training Material Builder**: Quality team tool for training content creation and publishing  
- **System Logs**: Database-level logging of user logins and actions  
- **Security Module**: Sessions, SQL injection protection, and access restrictions  
- **Role Management**: Entity-based permission control  
- **Data Visualization**: Embedded Looker Studio integration  
- **Export Functionality**: Team member data export capabilities  
- **Theme System**: Dynamic light/dark mode switching  
