package com.tradeshow.pulse24x7.mcp.service;

import com.tradeshow.pulse24x7.mcp.dao.UserDAO;
import com.tradeshow.pulse24x7.mcp.model.User;
import com.tradeshow.pulse24x7.mcp.utils.PasswordUtil;

public class UserAuthService {
    private final UserDAO userDAO;

    public UserAuthService() {
        this.userDAO = new UserDAO();
    }

    public User signup(String fullName, String email, String password) {
        if (fullName == null || fullName.isBlank() || email == null || email.isBlank() || password == null || password.length() < 6) {
            return null;
        }
        if (userDAO.findByEmail(email) != null) {
            return null;
        }
        String hash = PasswordUtil.hash(password);
        return userDAO.createUser(fullName.trim(), email.trim().toLowerCase(), hash);
    }

    public User login(String email, String password) {
        if (email == null || password == null) {
            return null;
        }
        User user = userDAO.findByEmail(email.trim().toLowerCase());
        if (user == null) {
            return null;
        }
        return PasswordUtil.verify(password, user.getPasswordHash()) ? user : null;
    }

    public User findById(long userId) {
        return userDAO.findById(userId);
    }
}
