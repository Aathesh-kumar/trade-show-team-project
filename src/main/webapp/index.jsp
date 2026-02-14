<%@ page import="java.util.List" %>
<html>
<body>
<h2>Hello World!</h2>
<% List<String> fruits = List.of("apple",  "orange", "grapes"); %>
<ul>
    <% for (String fruit : fruits) {%>
        <li><%=fruit%></li>
    <%}%>
</ul>
<script>
    window.onload = () => {
        window.location.href = "http://localhost:8080/trade-show-team-project/index.html";
    }
</script>
</body>
</html>
