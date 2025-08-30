import UserService from "../services/UserService.js";
export const getAllUsers = (req, res) => {
  res.json({
    success: true,
    data: {
      users: UserService.getUsernames(),
      count: UserService.getUsernames().length,
    },
  });
  console.log("✅ getAllUsers returning users:", UserService);
};
