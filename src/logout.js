export const logout = function () {
  Swal.fire({
    title: "🚪 Logout",
    text: "Are you sure you want to logout?",
    icon: "question",
    showCancelButton: true,
    confirmButtonText: "Yes, logout",
    cancelButtonText: "Cancel",
    confirmButtonColor: "#004d61",
  }).then((result) => {
    if (result.isConfirmed) {
      sessionStorage.removeItem("currentUser");
      Swal.fire({
        icon: "success",
        title: "👋 Logged Out",
        text: "You have been logged out successfully",
        showConfirmButton: false,
        timer: 1500,
      }).then(() => {
        window.location.href = "index.html";
      });
    }
  });
};

window.logout = logout;