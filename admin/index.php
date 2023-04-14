<?php
session_start();
include('../server_script/config.php');
if (isset($_POST['login'])) {

    $uname = $_POST['username'];
    $password = $_POST['password'];
    $sql = mysqli_query($con, "SELECT AdminUserName,AdminEmailId,AdminPassword FROM tbladmin WHERE (AdminUserName='$uname' || AdminEmailId='$uname')");
    $num = mysqli_fetch_array($sql);
    if ($num > 0) {
        $hashpassword = $num['AdminPassword'];
        if (password_verify($password, $hashpassword)) {
            $_SESSION['login'] = $_POST['username'];
            header('Location: dashboard.php');
        } else {
            echo "<script>alert('Wrong Password');</script>";
        }
    } else {
        echo "<script>alert('User not registered with us');</script>";
    }
}
?>

<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="News Portal.">
    <meta name="author" content="PHPGurukul">


    <title>ASTU NEWS | Admin Panel</title>

    <link href="assets/css/bootstrap.min.css" rel="stylesheet" type="text/css" />
    <link href="assets/css/core.css" rel="stylesheet" type="text/css" />
    <link href="assets/css/components.css" rel="stylesheet" type="text/css" />
    <link href="assets/css/icons.css" rel="stylesheet" type="text/css" />
    <link href="assets/css/pages.css" rel="stylesheet" type="text/css" />
    <link href="assets/css/menu.css" rel="stylesheet" type="text/css" />
    <link href="assets/css/responsive.css" rel="stylesheet" type="text/css" />
    <script src="assets/js/modernizr.min.js"></script>

</head>


<body class="bg-transparent">

    <section>
        <div class="container-alt">
            <div class="row">
                <div class="col-sm-12">
                    <div class="wrapper-page">
                        <div id="first ">
                            <div class="myform form ">
                                <div class="logo mb-3">
                                    <div class="col-md-12 text-center m-t-50 bg-success p-2 text-dark bg-opacity-25">
                                        <h1>ASTU NEWS Login</h1>
                                    </div>
                                </div>
                                <form class="form-horizontal" method="POST">
                                    <div class="form-group">
                                        <label for="InputEmail1">Username or email</label>
                                        <input type="text" name="username" class="form-control" id="username" aria-describedby="emailHelp" placeholder="Enter email">
                                    </div>
                                    <div class="form-group">
                                        <label for="password">Password</label>
                                        <input type="password" name="password" id="password" class="form-control" aria-describedby="emailHelp" placeholder="Enter Password">
                                    </div>

                                    <div class="col-md-12 text-center ">
                                        <button type="submit" class=" btn btn-block mybtn btn-primary tx-tfm" name="login">Login</button>
                                    </div>

                                    <div class="col-md-12 mb-3">

                                </form>

                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    </section>

</body>

</html>