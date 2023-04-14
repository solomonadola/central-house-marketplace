<?php
session_start();
include('../server_script/config.php');
error_reporting(0);
if (strlen($_SESSION['login']) == 0) {
    header('location:index.php');
} else {
    if (isset($_POST['submit'])) {
        $emailo = $_POST['email'];
        $adminid = $_SESSION['login'];
        $newemail = $_POST['newemail'];
        $cnewemail = $_POST['confirmemail'];
        $sql = mysqli_query($con, "SELECT AdminEmailId FROM  tbladmin where  AdminEmailId='$emailo'");
        $num = mysqli_fetch_array($sql);
        if ($num > 0) {
            $email = $num['email'];

            if ( $newemail==$cnewemail ) {

                $con = mysqli_query($con, "update tbladmin set AdminEmailId='$newemail' where AdminEmailId='$emailo'");
                $msg = "email Changed Successfully !!";
            }
        } else {
            $error = "Old emial  do  not match !!";
        }
    }


?>


    <!DOCTYPE html>
    <html lang="en">

    <head>

        <title>ASTU NEWS |</title>

        <link href="assets/css/bootstrap.min.css" rel="stylesheet" type="text/css" />
        <link href="assets/css/core.css" rel="stylesheet" type="text/css" />
        <link href="assets/css/components.css" rel="stylesheet" type="text/css" />
        <link href="assets/css/icons.css" rel="stylesheet" type="text/css" />
        <link href="assets/css/pages.css" rel="stylesheet" type="text/css" />
        <link href="assets/css/menu.css" rel="stylesheet" type="text/css" />
        <link href="assets/css/responsive.css" rel="stylesheet" type="text/css" />
        <link rel="stylesheet" href="../plugins/switchery/switchery.min.css">
        <script src="assets/js/modernizr.min.js"></script>
        <script type="text/javascript">
            function valid() {
                if (document.chngpwd.password.value == "") {
                    alert("Current Password Filed is Empty !!");
                    document.chngpwd.password.focus();
                    return false;
                } else if (document.chngpwd.newpassword.value == "") {
                    alert("New Password Filed is Empty !!");
                    document.chngpwd.newpassword.focus();
                    return false;
                } else if (document.chngpwd.confirmpassword.value == "") {
                    alert("Confirm Password Filed is Empty !!");
                    document.chngpwd.confirmpassword.focus();
                    return false;
                } else if (document.chngpwd.newpassword.value != document.chngpwd.confirmpassword.value) {
                    alert("Password and Confirm Password Field do not match  !!");
                    document.chngpwd.confirmpassword.focus();
                    return false;
                }
                return true;
            }
        </script>


    </head>


    <body class="fixed-left">

        <div id="wrapper">

            <?php include('includes/topheader.php'); ?>

            <?php include('includes/leftsidebar.php'); ?>
            <div class="content-page">
                <div class="content">
                    <div class="container">
                        <div class="row">
                            <div class="col-xs-12">
                                <div class="page-title-box">
                                    <h4 class="page-title">Chnage email</h4>
                                    <ol class="breadcrumb p-0 m-0">
                                        <li>
                                            <a href="#">Admin</a>
                                        </li>

                                        <li class="active">
                                            Change email
                                        </li>
                                    </ol>
                                    <div class="clearfix"></div>
                                </div>
                            </div>
                        </div>

                        <div class="row">
                            <div class="col-sm-12">
                                <div class="card-box">
                                    <h4 class="m-t-0 header-title"><b>Change email </b></h4>
                                    <hr />



                                    <div class="row">
                                        <div class="col-sm-6">
                                            <!---Success Message--->
                                            <?php if ($msg) { ?>
                                                <div class="alert alert-success" role="alert">
                                                    <strong>Well done!</strong> <?php echo htmlentities($msg); ?>
                                                </div>
                                            <?php } ?>

                                            <!---Error Message--->
                                            <?php if ($error) { ?>
                                                <div class="alert alert-danger" role="alert">
                                                    <strong>Oh snap!</strong> <?php echo htmlentities($error); ?>
                                                </div>
                                            <?php } ?>


                                        </div>
                                    </div>


                                    <div class="row">
                                        <div class="col-md-10">
                                            <form class="form-horizontal" name="chngpwd" method="post" onSubmit="return valid();">

                                                <div class="form-group">
                                                    <label class="col-md-4 control-label">Current email</label>
                                                    <div class="col-md-8">
                                                        <input type="email" class="form-control" value="" name="email" required>
                                                    </div>
                                                </div>


                                                <div class="form-group">
                                                    <label class="col-md-4 control-label">New email</label>
                                                    <div class="col-md-8">
                                                        <input type="email" class="form-control" value="" name="newemail" required>
                                                    </div>
                                                </div>


                                                <div class="form-group">
                                                    <label class="col-md-4 control-label">Confirm email</label>
                                                    <div class="col-md-8">
                                                        <input type="email" class="form-control" value="" name="confirmemail" required>
                                                    </div>
                                                </div>

                                                <div class="form-group">
                                                    <label class="col-md-4 control-label">&nbsp;</label>
                                                    <div class="col-md-8">

                                                        <button type="submit" class="btn btn-custom waves-effect waves-light btn-md" name="submit">
                                                            Submit
                                                        </button>
                                                    </div>
                                                </div>

                                            </form>
                                        </div>

                                    </div>

                                </div>
                            </div>
                        </div>


                    </div>  

                </div>  

                <?php include('common/footer.php'); ?>

            </div>
        </div>

        <script>
            var resizefunc = [];
        </script>

        <script src="assets/js/jquery.min.js"></script>
        <script src="assets/js/bootstrap.min.js"></script>
        <script src="assets/js/detect.js"></script>
        <script src="assets/js/fastclick.js"></script>
        <script src="assets/js/jquery.blockUI.js"></script>
        <script src="assets/js/waves.js"></script>
        <script src="assets/js/jquery.slimscroll.js"></script>
        <script src="assets/js/jquery.scrollTo.min.js"></script>
        <script src="../plugins/switchery/switchery.min.js"></script>

        <script src="assets/js/jquery.core.js"></script>
        <script src="assets/js/jquery.app.js"></script>

    </body>

    </html>
<?php } ?>